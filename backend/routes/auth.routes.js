import express from "express";
import passport from "../config/passport.js";

import {
  register,
  login,
  refreshAccessToken,
  logout,
  getMe,
  googleAuthCallback,
} from "../controllers/auth.controller.js";

import { protect } from "../middleware/auth.middleware.js";
import validate from "../middleware/validate.middleware.js";

import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
} from "../schemas/auth.schema.js";

const router = express.Router();

router.post("/register", validate(registerSchema), register);

router.post("/login", validate(loginSchema), login);

router.post("/refresh-token", validate(refreshTokenSchema), refreshAccessToken);

router.post("/logout", logout);

router.get("/me", protect, getMe);

router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/api/auth/google/failure",
  }),
  googleAuthCallback
);

router.get("/google/failure", (req, res) => {
  return res.status(401).json({
    success: false,
    message: "Google authentication failed",
  });
});

export default router;