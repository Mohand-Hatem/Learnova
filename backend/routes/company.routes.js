import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { chatSearchHandler, getSearchHistory } from "../controllers/company.controller.js";

const router = express.Router();

router.use(protect);
router.post("/search", chatSearchHandler);
router.get("/search/history", getSearchHistory);

export default router;