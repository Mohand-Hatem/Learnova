import User from "../models/User.model.js";
import { PLANS } from "../config/helpers.config.js";
import asyncHandler from "express-async-handler";
import CV from "../models/Cv.model.js";

export const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select("-password").lean();

  const userIds = users.map((user) => user._id);

  const cvs = await CV.find({
    userId: { $in: userIds },
  })
    .select("userId atsScore processingStatus originalFile createdAt")
    .lean();

  const usersWithCVs = users.map((user) => ({
    ...user,

    cvs: cvs.filter((cv) => cv.userId.toString() === user._id.toString()),
  }));

  res.status(200).json({
    success: true,
    count: usersWithCVs.length,
    data: usersWithCVs,
  });
});

export const getOneUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id).select("-password").lean();

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  const cvs = await CV.find({ userId: id }).lean();

  res.status(200).json({
    success: true,
    data: {
      ...user,
      cvs,
    },
  });
});

export const deleteUser = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const user = await User.findByIdAndDelete(id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  res.status(200).json({
    success: true,
    message: "User deleted successfully",
  });
});

export const updateUserRole = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { role } = req.body;

  const user = await User.findByIdAndUpdate(id, { role }, { new: true }).select(
    "-password",
  );

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  res.status(200).json({
    success: true,
    message: "Role updated successfully",
    data: user,
  });
});

export const updateUserPlan = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { plan } = req.body;

  const maxToken = PLANS[plan].maxToken;

  const user = await User.findByIdAndUpdate(
    id,
    { plan, maxToken },
    { new: true },
  ).select("-password");

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  res.status(200).json({
    success: true,
    message: "Plan updated successfully",
    data: user,
  });
});
