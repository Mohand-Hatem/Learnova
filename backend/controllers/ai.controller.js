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
  vectorIndex
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

  // ✅ نحسب الرصيد المتبقي بعد أي استهلاك حصل فوق (زي الـ embedding)
  // عشان analyzeCV تعرف تحدد max_tokens المناسب من غير ما تتخطى رصيد اليوزر
  const freshUser = await User.findById(userId).select("tokenUsage maxToken");
  const remainingQuota = freshUser
    ? freshUser.maxToken - freshUser.tokenUsage
    : null;

  let analysisResult;
  try {
    analysisResult = await analyzeCV(context, remainingQuota);
  } catch (err) {
    if (err.code === "INSUFFICIENT_QUOTA") {
      return res.status(403).json({
        success: false,
        message: "Token quota too low to complete a full analysis. Please upgrade your plan.",
        tokenUsage: freshUser?.tokenUsage,
        maxToken: freshUser?.maxToken,
      });
    }
    if (err.code === "EMPTY_ANALYSIS") {
      return res.status(502).json({
        success: false,
        message: "AI model failed to generate a proper analysis after multiple attempts. Please try again.",
      });
    }
    throw err;
  }

  const { report, promptTokens, completionTokens, totalTokens, responseTimeMs } =
    analysisResult;

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
    await vectorIndex.delete(cv.pineconeVectorIds);
  }

  await CV.findByIdAndDelete(req.params.cvId);

  return res.status(200).json({ success: true, message: "CV deleted successfully" });
});