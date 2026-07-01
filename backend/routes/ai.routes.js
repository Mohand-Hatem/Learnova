

import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import roleMiddleware from "../middleware/role.middleware.js";
import {
  health,
  analyzeCVHandler,
  getCVById,
  deleteCV,
  searchCandidatesHandler,
} from "../controllers/ai.controller.js";

const router = express.Router();

// Health — public
router.get("/health", health);

router.use(protect);

router.post("/search/candidates", searchCandidatesHandler);
// CV analysis routes (user)
router.post("/:cvId", analyzeCVHandler);
router.get("/:cvId", getCVById);
router.delete("/:cvId", deleteCV);

// Company search route
// router.post("/search/candidates", roleMiddleware("company"), searchCandidatesHandler);

export default router;
