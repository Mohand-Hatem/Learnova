import express from "express";
import { protectDashboard } from "../middleware/auth.middleware.js";
import {
  chatSearchHandler,
  filterCVsHandler,
  getSearchHistory,
} from "../controllers/company.controller.js";

const router = express.Router();

router.use(protectDashboard);
router.post("/search", chatSearchHandler);
router.get("/search/history", getSearchHistory);
router.post("/filter", filterCVsHandler);

export default router;