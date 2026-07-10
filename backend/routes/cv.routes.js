import { Router } from "express";
import { protect } from "../middleware/auth.middleware.js";
import roleMiddleware from "../middleware/role.middleware.js";
import { uploadFile } from "../middleware/upload.middleware.js";
import {
  uploadCV,
  getMyCVs,
  getCVById,
  deleteCV,
  updateCV,
  filterCVs,
} from "../controllers/cv.controller.js";

const router = Router();

router.use(protect);
router.post("/upload", uploadFile, uploadCV);

router.get("/my-cvs", getMyCVs);

// Filter endpoint must be placed before /:id to avoid interpreting "filter" as an ID
router.get("/filter", roleMiddleware("admin", "company"), filterCVs);

router.get("/:id", getCVById);

router.delete("/:id", deleteCV);

router.put("/:id", uploadFile, updateCV);

export default router;
