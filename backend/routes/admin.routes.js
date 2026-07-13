import express from "express";

import {
  getAllUsers,
  deleteUser,
  updateUserRole,
  updateUserPlan,
  getOneUser,
  getAiStats,
  getOverviewStats,
  toggleBanUser,
  getAdminActionHistory,
} from "../controllers/admin.controller.js";

import { protect } from "../middleware/auth.middleware.js";
import roleMiddleware from "../middleware/role.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { updateRoleSchema, updatePlanSchema } from "../schemas/admin.schema.js";

const router = express.Router();

router.use(protect);
router.use(roleMiddleware("admin"));

router.get("/all", getAllUsers);
router.get("/stats/overview", getOverviewStats);
router.get("/stats/ai", getAiStats);
router.get("/:id/actions", getAdminActionHistory);
router.get("/:id", getOneUser);

router.delete("/user/:id", deleteUser);

router.put("/user/:id/role", validate(updateRoleSchema), updateUserRole);

router.put("/user/:id/plan", validate(updatePlanSchema), updateUserPlan);

router.put("/:id/ban", toggleBanUser);

export default router;
