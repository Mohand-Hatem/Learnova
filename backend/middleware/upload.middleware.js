import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";
import {
  IMAGE_FORMATS,
  DOCUMENT_FORMATS,
  ALLOWED_IMAGE_MIMES,
  ALLOWED_DOC_MIMES,
} from "../config/helpers.config.js";

const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req) => ({
    folder: "learnova/avatars",
    resource_type: "image",
    allowed_formats: IMAGE_FORMATS,
    transformation: [
      { width: 300, height: 300, crop: "fill", quality: "auto" },
    ],
    public_id: `avatar_${req.user?._id ?? Date.now()}`,
  }),
});

const documentStorage = new CloudinaryStorage({
  cloudinary,
  params: async (_, file) => {
    const isPDF = file.mimetype === "application/pdf";
    const isDoc =
      file.mimetype === "application/msword" ||
      file.mimetype ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    return {
      folder: isPDF || isDoc ? "learnova/docs" : "learnova/images",
      resource_type: isPDF || isDoc ? "raw" : "image",
      allowed_formats: DOCUMENT_FORMATS,
      public_id: `file_${Date.now()}`,
    };
  },
});

const avatarFilter = (_, file, cb) => {
  if (ALLOWED_IMAGE_MIMES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Avatar must be an image (JPEG, PNG)."), false);
  }
};

const documentFilter = (_, file, cb) => {
  if (ALLOWED_DOC_MIMES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Allowed file types: PDF, DOC, DOCX."), false);
  }
};

export const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: avatarFilter,
}).single("avatar");

export const uploadFile = multer({
  storage: documentStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: documentFilter,
}).single("file");
