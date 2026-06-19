import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { health, analyzeCVHandler, getCVById, deleteCV } from "../controllers/ai.controller.js";

const router = express.Router();

// Health — public, no auth required
router.get("/health", health);

router.use(protect);

router.post("/:cvId", analyzeCVHandler);
router.get("/:cvId", getCVById);
router.delete("/:cvId", deleteCV);

export default router;
