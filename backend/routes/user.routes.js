import { Router } from "express";
import {
  getProfile,
  updateProfile,
  updatePassword,
  forgotPassword,
  resetPassword,
  uploadUserFile,          
} from "../controllers/user.controller.js";

import { protect } from "../middleware/auth.middleware.js";
import { uploadAvatar, uploadFile,    handleAvatarUpload,
  handleFileUpload, } from "../middleware/upload.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  updateProfileSchema,
  updatePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../schemas/user.schema.js";

const router = Router();

router.get("/me", protect, getProfile);

router.put(
  "/update-profile",
  protect,
  uploadAvatar,
  handleAvatarUpload,
  validate(updateProfileSchema),
  updateProfile
);
router.put("/update-password", protect, validate(updatePasswordSchema), updatePassword);

router.post(
  "/upload-file",
  protect,
  uploadFile,
  handleFileUpload,
  uploadUserFile
);
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password/:token", validate(resetPasswordSchema), resetPassword); // ✅
///
router.put("/update-profile", protect, validate(updateProfileSchema), updateProfile);
export default router;