import express from "express";

import {
  getAllUsers,
  deleteUser,
  updateUserRole,
  updateUserPlan,
} from "../controllers/admin.controller.js";

import { protect } from "../middleware/auth.middleware.js";
import roleMiddleware from "../middleware/role.middleware.js";

const router = express.Router();

// ALL ADMIN ROUTES ARE PROTECTED
router.use(protect);
router.use(roleMiddleware("admin"));

// GET ALL USERS
router.get("/users", getAllUsers);

// DELETE USER
router.delete("/users/:id", deleteUser);

// UPDATE ROLE
router.put("/users/:id/role", updateUserRole);

// UPDATE PLAN
router.put("/users/:id/plan", updateUserPlan);

export default router;