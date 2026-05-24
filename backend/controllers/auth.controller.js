import jwt from "jsonwebtoken";
import User from "../models/User.model.js";
import { generateTokens } from "../utils/generateTokens.js";
import asyncHandler from "express-async-handler";
import { sendWelcomeEmail } from "../utils/sendEmail.js";
import Env from "../config/handelEnv.js";
import bcrypt from "bcryptjs";
import sendResetPasswordEmail from "../utils/sendResetPasswordEmail.js";
import CV from "../models/Cv.model.js";

const accessCookieOptions = {
  httpOnly: true,
  secure: Env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 15 * 60 * 1000,
};

const refreshCookieOptions = {
  httpOnly: true,
  secure: Env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const setAuthCookies = (res, accessToken, refreshToken) => {
  res.cookie("accessToken", accessToken, accessCookieOptions);
  res.cookie("refreshToken", refreshToken, refreshCookieOptions);
};

const clearAuthCookies = (res) => {
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");
};

const formatUser = async (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  avatar: user.avatar,
  plan: user.plan,
  maxToken: user.maxToken,
  tokenUsage: user.tokenUsage,
  googleId: user.googleId,
  cvs: await CV.find({ userId: user._id }).sort({ createdAt: -1 }),
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export const register = asyncHandler(async (req, res, next) => {
  const { name, email, password, role } = req.body;

  const existingUser = await User.findOne({ email });

  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: "Email already exists",
    });
  }

  const user = await User.create({
    name,
    email,
    password,
    role: role || "user",
  });

  const { accessToken, refreshToken } = generateTokens(user);

  setAuthCookies(res, accessToken, refreshToken);

  sendWelcomeEmail(user.email, user.name).catch((err) => {
    console.error("Error sending welcome email:", err);
  });
  return res.status(201).json({
    success: true,
    message: "Account created successfully",
    data: {
      user: await formatUser(user),
    },
  });
});

export const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password",
    });
  }

  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password",
    });
  }

  const { accessToken, refreshToken } = generateTokens(user);

  setAuthCookies(res, accessToken, refreshToken);

  return res.status(200).json({
    success: true,
    message: "Logged in successfully",
    data: {
      user: await formatUser(user),
    },
  });
});

export const refreshAccessToken = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.refreshToken;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Refresh token is required",
    });
  }

  try {
    const decoded = jwt.verify(token, Env.JWT_REFRESH_SECRET);

    const user = await User.findById(decoded.id);

    if (!user) {
      clearAuthCookies(res);

      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    const { accessToken, refreshToken } = generateTokens(user);

    setAuthCookies(res, accessToken, refreshToken);

    return res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      data: {
        user: await formatUser(user),
      },
    });
  } catch (error) {
    clearAuthCookies(res);
    throw error;
  }
});

export const logout = (req, res) => {
  clearAuthCookies(res);

  return res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
};

export const getMe = asyncHandler(async (req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      user: await formatUser(req.user),
    },
  });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    res.status(404);
    throw new Error("No account found with this email");
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  const hashedOtp = await bcrypt.hash(otp, 10);

  user.resetOtp = hashedOtp;
  user.resetOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();

  await sendResetPasswordEmail(user.email, user.name.en, otp);

  res.json({ message: "OTP sent to your email. It expires in 10 minutes." });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;

  const user = await User.findOne({ email }).select(
    "+resetOtp +resetOtpExpires",
  );

  if (!user || !user.resetOtp || !user.resetOtpExpires) {
    res.status(400);
    throw new Error("No password reset was requested for this account");
  }

  if (user.resetOtpExpires < new Date()) {
    user.resetOtp = null;
    user.resetOtpExpires = null;
    await user.save();
    res.status(400);
    throw new Error("OTP has expired. Please request a new one.");
  }

  const isMatch = await bcrypt.compare(otp, user.resetOtp);
  if (!isMatch) {
    res.status(400);
    throw new Error("Invalid OTP");
  }

  user.password = newPassword;
  user.resetOtp = null;
  user.resetOtpExpires = null;
  await user.save();

  res.json({ message: "Password reset successfully. You can now log in." });
});

export const googleAuthCallback = asyncHandler(async (req, res, next) => {
  const { accessToken, refreshToken } = generateTokens(req.user);

  setAuthCookies(res, accessToken, refreshToken);

  return res.status(200).json({
    success: true,
    message: "Google login successful",
    data: {
      user: await formatUser(req.user),
    },
  });
});
