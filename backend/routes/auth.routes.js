import express from "express";
import passport from "../config/passport.js";
import {
  register,
  login,
  refreshAccessToken,
  logout,
  getMe,
  googleAuthCallback,
  forgotPassword,
  resetPassword,
} from "../controllers/auth.controller.js";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../schemas/user.schema.js";
import { protect } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { registerSchema, loginSchema } from "../schemas/auth.schema.js";

const router = express.Router();

router.post("/register", validate(registerSchema), register);

router.post("/login", validate(loginSchema), login);

router.post("/refresh", refreshAccessToken);

router.post("/logout", logout);

router.get("/me", protect, getMe);

router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);

router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  }),
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/auth/google/failure",
  }),
  googleAuthCallback,
);

router.get("/google/failure", (req, res) => {
  return res.status(401).json({
    success: false,
    message: "Google authentication failed",
  });
});

export default router;
