import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.model.js";
import { generateTokens } from "../utils/generateTokens.js";

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    const exists = await User.findOne({ email });

    if (exists) {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || "student",
      provider: "local",
    });

    const { accessToken, refreshToken } = generateTokens(user);

    res.cookie("refreshToken", refreshToken, cookieOptions);

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      data: {
        user,
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Account blocked",
      });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const { accessToken, refreshToken } = generateTokens(user);

    res.cookie("refreshToken", refreshToken, cookieOptions);

    res.json({
      success: true,
      data: {
        user,
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refreshAccessToken = async (req, res) => {
  try {
    const token = req.body.refreshToken || req.cookies.refreshToken;

    if (!token) {
      return res.status(401).json({ message: "No refresh token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

    const user = await User.findById(decoded.id);

    const tokens = generateTokens(user);

    res.cookie("refreshToken", tokens.refreshToken, cookieOptions);

    res.json({
      success: true,
      data: tokens,
    });
  } catch {
    res.status(401).json({
      success: false,
      message: "Invalid refresh token",
    });
  }
};

export const logout = (req, res) => {
  res.clearCookie("refreshToken");
  res.json({ success: true });
};

export const getMe = (req, res) => {
  res.json({
    success: true,
    data: req.user,
  });
};

export const googleAuthCallback = (req, res) => {
  const tokens = generateTokens(req.user);

  res.cookie("refreshToken", tokens.refreshToken, cookieOptions);

  res.json({
    success: true,
    data: {
      user: req.user,
      ...tokens,
    },
  });
};