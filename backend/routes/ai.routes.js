import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { health, analyzeCVHandler, getCVById, deleteCV } from "../controllers/ai.controller.js";

const router = express.Router();

router.use(protect);

router.get("/health", health);
router.post("/:cvId", analyzeCVHandler);
router.get("/:cvId", getCVById);
router.delete("/:cvId", deleteCV);

export default router;
