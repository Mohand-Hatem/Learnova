import jwt from "jsonwebtoken";
import Env from "../config/handelEnv.js";

export const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    Env.JWT_SECRET,
    { expiresIn: "60m" },
  );
};

export const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
    },
    Env.JWT_REFRESH_SECRET,
    { expiresIn: "7d" },
  );
};

export const generateTokens = (user) => {
  return {
    accessToken: generateAccessToken(user),
    refreshToken: generateRefreshToken(user),
  };
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, Env.JWT_SECRET);
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
}