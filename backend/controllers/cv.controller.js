import CV from "../models/Cv.model.js";
import { MIME_TO_FILETYPE } from "../config/helpers.config.js";
import asyncHandler from "express-async-handler";

export const uploadCV = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "No file uploaded. Please attach a PDF, DOC, or DOCX file.",
    });
  }

  const fileType = MIME_TO_FILETYPE[req.file.mimetype] ?? null;
  if (!fileType) {
    return res.status(400).json({
      success: false,
      message: "Invalid file type. Allowed: PDF, DOC, DOCX.",
    });
  }

  const cv = await CV.create({
    userId: req.user._id,
    originalFile: {
      url: req.file.path,
      publicId: req.file.filename,
      fileType,
      fileName: req.file.originalname,
      fileSize: req.file.size,
    },
    processingStatus: "uploaded",
  });

  res.status(201).json({
    success: true,
    message: "CV uploaded successfully",
    data: {
      id: cv._id,
      url: cv.originalFile.url,
      fileType: cv.originalFile.fileType,
      fileName: cv.originalFile.fileName,
      fileSize: cv.originalFile.fileSize,
      status: cv.processingStatus,
      uploadedAt: cv.createdAt,
    },
  });
});

export const getMyCVs = asyncHandler(async (req, res, next) => {
  const cvs = await CV.find({ userId: req.user._id })
    .select("originalFile processingStatus atsScore createdAt")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: cvs.length,
    data: cvs,
  });
});

export const getCVById = asyncHandler(async (req, res, next) => {
  const cv = await CV.findOne({ _id: req.params.id, userId: req.user._id });

  if (!cv) {
    return res.status(404).json({
      success: false,
      message: "CV not found",
    });
  }

  res.status(200).json({
    success: true,
    data: cv,
  });
});

export const deleteCV = asyncHandler(async (req, res, next) => {
  const cv = await CV.findOneAndDelete({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!cv) {
    return res.status(404).json({
      success: false,
      message: "CV not found",
    });
  }

  res.status(200).json({
    success: true,
    message: "CV deleted successfully",
  });
});
