import axios from "axios";
import { extractText } from "unpdf";
import asyncHandler from "express-async-handler";
import cloudinary from "../config/cloudinary.js";
import CV from "../models/Cv.model.js";
import User from "../models/User.model.js";
import {
  embedAndStore,
  queryCV,
  analyzeCV,
  pineconeIndex,
  searchCandidates
} from "../Vector/cv.ai.js";

export const health = (_, res) => {
  res.json({ success: true, message: "Server running" });
};

export const analyzeCVHandler = asyncHandler(async (req, res) => {
  const { cvId } = req.params;
  const userId = req.user?._id;

  const [cv, user] = await Promise.all([
    CV.findById(cvId),
    User.findById(userId).select("tokenUsage maxToken aiCallsCount"),
  ]);

  if (!cv) {
    return res.status(404).json({ success: false, message: "CV not found" });
  }

  // token quota check — block if user exceeded their plan limit
  if (user && user.tokenUsage >= user.maxToken) {
    return res.status(403).json({
      success: false,
      message: "Token quota exceeded. Please upgrade your plan.",
      tokenUsage: user.tokenUsage,
      maxToken: user.maxToken,
    });
  }

  // if not embedded yet (uploaded via basic /cv/upload), extract + embed first
  if (!cv.pineconeVectorIds?.length) {
    let extractedText = cv.extractedText;

    if (!extractedText) {
      const fileResponse = await axios.get(cv.originalFile.url, {
        responseType: "arraybuffer",
      });
      const buffer = new Uint8Array(fileResponse.data);
      const { text } = await extractText(buffer);
      extractedText = Array.isArray(text) ? text.join("\n").trim() : (text ?? "").trim();
    }

    if (!extractedText) {
      return res.status(400).json({
        success: false,
        message: "Unable to extract text from this CV.",
      });
    }

    const { vectorIds: pineconeVectorIds, embeddingTokens } = await embedAndStore(
      cvId,
      extractedText,
    );

    await CV.findByIdAndUpdate(cvId, {
      extractedText,
      pineconeVectorIds,
      processingStatus: "processing",
      "aiUsage.embeddingTokens": embeddingTokens,
      $inc: { "aiUsage.totalTokens": embeddingTokens },
    });

    await User.findByIdAndUpdate(userId, {
      $inc: { tokenUsage: embeddingTokens },
    });
  }

  const context = await queryCV(cvId);

  const { report, promptTokens, completionTokens, totalTokens, responseTimeMs } =
    await analyzeCV(context);

  const { atsScore, scoreBreakdown, parsedData, aiAnalysis } = report;

  await CV.findByIdAndUpdate(cvId, {
    atsScore,
    scoreBreakdown,
    parsedData,
    aiAnalysis,
    processingStatus: "analyzed",
    "aiUsage.promptTokens": promptTokens,
    "aiUsage.completionTokens": completionTokens,
    $inc: { "aiUsage.totalTokens": totalTokens },
    "aiUsage.responseTimeMs": responseTimeMs,
    "aiUsage.analyzedAt": new Date(),
  });

  await User.findByIdAndUpdate(userId, {
    $inc: { tokenUsage: totalTokens, aiCallsCount: 1 },
  });

  return res.status(200).json({
    success: true,
    message: "CV analyzed successfully",
    report,
    usage: { promptTokens, completionTokens, totalTokens, responseTimeMs },
  });
});

export const getCVById = asyncHandler(async (req, res) => {
  const cv = await CV.findById(req.params.cvId);

  if (!cv) {
    return res.status(404).json({ success: false, message: "CV not found" });
  }

  return res.status(200).json({ success: true, cv });
});

export const deleteCV = asyncHandler(async (req, res) => {
  const cv = await CV.findById(req.params.cvId);

  if (!cv) {
    return res.status(404).json({ success: false, message: "CV not found" });
  }

  if (cv.originalFile.publicId) {
    await cloudinary.uploader.destroy(cv.originalFile.publicId, {
      resource_type: "raw",
    });
  }

  if (cv.pineconeVectorIds?.length) {
    await pineconeIndex.deleteMany(cv.pineconeVectorIds);
  }

  await CV.findByIdAndDelete(req.params.cvId);

  return res.status(200).json({ success: true, message: "CV deleted successfully" });
});
export const searchCandidatesHandler = asyncHandler(async (req, res) => {
  const { query, topK = 10 } = req.body;

  if (!query || typeof query !== "string" || query.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: "Search query is required",
    });
  }

  // 1. Search Pinecone for matching CVs
  const matches = await searchCandidates(query.trim(), topK);

  if (!matches.length) {
    return res.status(200).json({
      success: true,
      data: { candidates: [], total: 0 },
    });
  }

  // 2. Fetch CV + User data from MongoDB
  const cvIds = matches.map((m) => m.cvId);

  const cvs = await CV.find({ _id: { $in: cvIds } })
    .select("userId atsScore parsedData aiAnalysis originalFile processingStatus createdAt")
    .lean();

  const userIds = cvs.map((cv) => cv.userId);
  const users = await User.find({ _id: { $in: userIds } })
    .select("name email avatar plan role")
    .lean();

  const userMap = new Map(users.map((u) => [u._id.toString(), u]));
  const scoreMap = new Map(matches.map((m) => [m.cvId, m.score]));

  // 3. Build response
  const candidates = cvs
    .map((cv) => {
      const user = userMap.get(cv.userId?.toString());
      if (!user || user.role === "admin") return null;

      return {
        cvId: cv._id,
        userId: cv.userId,
        matchScore: Math.round((scoreMap.get(cv._id.toString()) ?? 0) * 100),
        atsScore: cv.atsScore ?? 0,
        processingStatus: cv.processingStatus,
        user: {
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          plan: user.plan,
        },
        skills: cv.parsedData?.skills?.technical ?? [],
        summary: cv.aiAnalysis?.summary ?? "",
        originalFile: {
          url: cv.originalFile?.url,
          fileName: cv.originalFile?.fileName,
        },
        createdAt: cv.createdAt,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.matchScore - a.matchScore);

  return res.status(200).json({
    success: true,
    data: { candidates, total: candidates.length },
  });
});

