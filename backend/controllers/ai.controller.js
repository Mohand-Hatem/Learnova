import axios from "axios";
import { extractText } from "unpdf";
import mammoth from "mammoth";
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

const TOKEN_LIMIT_REACHED_MESSAGE =
  "Token limit reached. Your monthly token quota has been exhausted. Please wait for the monthly reset or upgrade your plan.";

export const health = (_, res) => {
  res.json({ success: true, message: "Server running" });
};

export const analyzeCVHandler = asyncHandler(async (req, res) => {
  const { cvId } = req.params;
  const userId = req.user?._id;

  const [cv, user] = await Promise.all([
    CV.findById(cvId),
    User.findById(userId).select("tokenUsage maxToken"),
  ]);

  if (!cv) {
    return res.status(404).json({ success: false, message: "CV not found" });
  }

  if (!user) {
    return res.status(404).json({ success: false, message: "User account not found" });
  }

  if (user.tokenUsage >= user.maxToken) {
    return res.status(403).json({
      success: false,
      code: "TOKEN_LIMIT_REACHED",
      message: TOKEN_LIMIT_REACHED_MESSAGE,
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

      if (cv.originalFile.fileType === "docx") {
        const result = await mammoth.extractRawText({
          buffer: Buffer.from(fileResponse.data),
        });
        extractedText = (result.value ?? "").trim();
      } else if (cv.originalFile.fileType === "pdf") {
        const buffer = new Uint8Array(fileResponse.data);
        const { text } = await extractText(buffer);
        extractedText = Array.isArray(text) ? text.join("\n").trim() : (text ?? "").trim();
      } else if (cv.originalFile.fileType === "doc") {
        return res.status(400).json({
          success: false,
          message: "We currently do not support AI analysis for the old .doc format. Please upload your CV as a .docx or .pdf file.",
        });
      } else {
        return res.status(400).json({
          success: false,
          message: "Unsupported file type for AI analysis. Please upload a PDF or DOCX file.",
        });
      }
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

    if (embeddingTokens > 0) {
      await User.findByIdAndUpdate(userId, {
        $inc: { tokenUsage: Math.round(embeddingTokens) },
      });
    }
  }

  const { context, queryTokens } = await queryCV(cvId);

  if (queryTokens > 0) {
    await Promise.all([
      CV.findByIdAndUpdate(cvId, {
        $inc: {
          "aiUsage.totalTokens": queryTokens,
        },
      }),
      User.findByIdAndUpdate(userId, {
        $inc: { tokenUsage: Math.round(queryTokens) },
      }),
    ]);
  }

  if (!context || !context.trim()) {
    return res.status(422).json({
      success: false,
      message: "Failed to retrieve CV content for analysis. Please try again in a moment.",
    });
  }

  let analysisResult;
  try {
    analysisResult = await analyzeCV(context);
  } catch (err) {
    if (err.usage?.totalTokens) {
      await User.findByIdAndUpdate(userId, {
        $inc: { tokenUsage: Math.round(err.usage.totalTokens) },
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

  if (totalTokens > 0) {
    await User.findByIdAndUpdate(userId, {
      $inc: { tokenUsage: Math.round(totalTokens), aiCallsCount: 1 },
    });
  } else {
    await User.findByIdAndUpdate(userId, {
      $inc: { aiCallsCount: 1 },
    });
  }

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