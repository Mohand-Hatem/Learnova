import jwt from "jsonwebtoken";
import User from "../models/User.model.js";
import Env from "../config/handelEnv.js";

export const protect = async (req, res, next) => {
  try {
    const token = req.cookies.accessToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, no token provided",
      });
    }

    const decoded = jwt.verify(token, Env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    req.user = user;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token + " + error.message,
    });
  }
};

// ✅ نفس منطق protect بالظبط، بس بيقرا كوكي منفصل (dashboardAccessToken)
// عشان جلسة الداشبورد متتخزنش في نفس الكوكي بتاع الموقع الرئيسي — الاتنين
// بيكلموا نفس الـ backend، فلو استخدموا نفس اسم الكوكي، تسجيل دخول في
// حتة بيمسح جلسة التانية (ده كان سبب الـ bug الأصلي)
export const protectDashboard = async (req, res, next) => {
  try {
    const token = req.cookies.dashboardAccessToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, no token provided",
      });
    }

    const decoded = jwt.verify(token, Env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    req.user = user;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token + " + error.message,
    });
  }
};
