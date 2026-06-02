import express from "express";

import {
  getAllUsers,
  deleteUser,
  updateUserRole,
  updateUserPlan,
  getOneUser,
} from "../controllers/admin.controller.js";
import { getDashboard } from "../controllers/admin.dashboard.controller.js";

import { protect } from "../middleware/auth.middleware.js";
import roleMiddleware from "../middleware/role.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { updateRoleSchema, updatePlanSchema } from "../schemas/admin.schema.js";

const router = express.Router();

router.use(protect);
router.use(roleMiddleware("admin"));

router.get("/dashboard", getDashboard);
router.get("/all", getAllUsers);
router.get("/:id", getOneUser);

router.delete("/user/:id", deleteUser);

router.put("/user/:id/role", validate(updateRoleSchema), updateUserRole);

router.put("/user/:id/plan", validate(updatePlanSchema), updateUserPlan);

export default router;
