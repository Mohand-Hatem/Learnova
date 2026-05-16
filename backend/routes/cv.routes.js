import { Router } from "express";
import { protect } from "../middleware/auth.middleware.js";
import { uploadFile } from "../middleware/upload.middleware.js";
import {
  uploadCV,
  getMyCVs,
  getCVById,
  deleteCV,
} from "../controllers/cv.controller.js";

const router = Router();

router.use(protect);

router.post("/upload", uploadFile, uploadCV);

router.get("/my-cvs", getMyCVs);

router.get("/:id", getCVById);

router.delete("/:id", deleteCV);

export default router;
