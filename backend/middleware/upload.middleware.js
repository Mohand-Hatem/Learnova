
import multer from "multer";
import cloudinary from "../config/cloudinary.js";
import { Readable } from "stream";

const uploadToCloudinary = (buffer, options) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    Readable.from(buffer).pipe(uploadStream);
  });
};

const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
    "video/mp4",
    "video/mkv",
    "video/webm",
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("File type not allowed"), false);
  }
};

export const uploadAvatar = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter,
}).single("avatar");

export const uploadFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter,
}).single("file");

export const handleAvatarUpload = async (req, res, next) => {
  try {
    if (!req.file) return next();
    const result = await uploadToCloudinary(req.file.buffer, {
      folder: "learnova/avatars",
      transformation: [{ width: 300, height: 300, crop: "fill" }],
    });
    req.file.path = result.secure_url;
    next();
  } catch (error) {
    next(error);
  }
};

export const handleFileUpload = async (req, res, next) => {
  try {
    if (!req.file) return next();

    let folder = "learnova/files";
    let resource_type = "auto";

    if (req.file.mimetype === "application/pdf") {
      folder = "learnova/pdfs";
    } else if (req.file.mimetype.startsWith("video/")) {
      folder = "learnova/videos";
    } else if (req.file.mimetype.startsWith("image/")) {
      folder = "learnova/images";
    }

    const result = await uploadToCloudinary(req.file.buffer, {
      folder,
      resource_type,
    });
    req.file.path = result.secure_url;
    next();
  } catch (error) {
    next(error);
  }
};