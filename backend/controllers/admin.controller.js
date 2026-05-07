import User from "../models/User.model.js";
import PLANS from "../config/plan.config.js";

// GET /api/admin/users
export const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().select("-password");

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};
export const deleteUser = async (req, res, next) => {
  try {
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
  } catch (error) {
    next(error);
  }
};
export const updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const user = await User.findByIdAndUpdate(
      id,
      { role },
      { new: true }
    ).select("-password");

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
  } catch (error) {
    next(error);
  }
};
export const updateUserPlan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { plan } = req.body;

    const validPlans = ["Free", "Pro", "Enterprise"];

    if (!validPlans.includes(plan)) {
      return res.status(400).json({
        success: false,
        message: "Invalid plan",
      });
    }

    let maxToken;

    switch (plan) {
      case "Free":
        maxToken = 1000;
        break;
      case "Pro":
        maxToken = 2000;
        break;
      case "Enterprise":
        maxToken = 4000;
        break;
    }

    const user = await User.findByIdAndUpdate(
      id,
      {
        plan,
        maxToken,
      },
      { new: true }
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
  } catch (error) {
    next(error);
  }
};