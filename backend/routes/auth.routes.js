import express from "express";
import passport, { isGoogleAuthEnabled } from "../config/passport.js";
import {
  register,
  login,
  refreshAccessToken,
  logout,
  getMe,
  googleAuthCallback,
  forgotPassword,
  resetPassword,
  dashboardLogin,
  dashboardRefreshToken,
  dashboardLogout,
  getDashboardMe,
} from "../controllers/auth.controller.js";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../schemas/user.schema.js";
import { protect, protectDashboard } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { registerSchema, loginSchema } from "../schemas/auth.schema.js";

const router = express.Router();

router.post("/register", validate(registerSchema), register);

router.post("/login", validate(loginSchema), login);

router.post("/refresh", refreshAccessToken);

router.post("/logout", logout);

router.get("/me", protect, getMe);

// ✅ نسخة الداشبورد من endpoints الـ auth — كوكيز منفصلة تماماً عن
// الموقع الرئيسي (شوف dashboardLogin/dashboardRefreshToken/dashboardLogout
// /getDashboardMe في auth.controller.js)
router.post("/dashboard-login", validate(loginSchema), dashboardLogin);

router.post("/dashboard-refresh", dashboardRefreshToken);

router.post("/dashboard-logout", dashboardLogout);

router.get("/dashboard-me", protectDashboard, getDashboardMe);

router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);

if (isGoogleAuthEnabled) {
  router.get("/google", (req, res, next) => {
    const role = req.query.role === "company" ? "company" : "user";
    passport.authenticate("google", {
      scope: ["profile", "email"],
      state: role, // saved through Google redirect
    })(req, res, next);
  });
  
    router.get(
      "/google/callback",
      passport.authenticate("google", {
        session: false,
        failureRedirect: "/auth/google/failure",
      }),
      googleAuthCallback,
    );
  } else {
    router.get("/google", (req, res) =>{
      return res.status(503).json({
        success: false,
        message: "Google authentication is not configured on this server.",
      });
    });
    router.get("/google/callback", (req, res) =>{
      return res.status(503).json({
        success: false,
        message: "Google authentication is not configured on this server.",
      });
    });
  }
  router.get("/google/failure", (req, res) => {
    return res.status(401).json({
      success: false,
      message: "Google authentication failed",
    });
});

export default router;
