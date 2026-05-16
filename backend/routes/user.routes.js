import { Router } from "express";
import {
  getProfile,
  updateProfile,
  updatePassword,
  uploadUserFile,
  paymobWebhook,
  payWithPaymob,
  userUpdateSubscription,
} from "../controllers/user.controller.js";

import { protect } from "../middleware/auth.middleware.js";
import { uploadAvatar, uploadFile } from "../middleware/upload.middleware.js";
import {
  parseJsonFields,
  validate,
} from "../middleware/validate.middleware.js";
import {
  updateProfileSchema,
  updatePasswordSchema,
} from "../schemas/user.schema.js";

const router = Router();

router.get("/me", protect, getProfile);

router.put(
  "/update-profile",
  protect,
  uploadAvatar,
  parseJsonFields,
  validate(updateProfileSchema),
  updateProfile,
);

router.put(
  "/update-password",
  protect,

  validate(updatePasswordSchema),
  updatePassword,
);

router.post("/upload-file", protect, uploadFile, uploadUserFile);

router.put("/subscription", protect, userUpdateSubscription);
router.post("/pay", protect, payWithPaymob);
router.post("/webhook", paymobWebhook);

export default router;
