import crypto from "crypto";
import User from "../models/User.model.js";
import { sendEmail } from "../utils/sendEmail.js";


export const getProfile = async (req, res, next) => {
  try {

    res.status(200).json({
      success: true,
      data: req.user,
    });
  } catch (error) {
    next(error);
  }
};


export const updateProfile = async (req, res, next) => {
  try {
    const { name } = req.body;

  
    const updateData = {};

 
    if (name) {
      updateData.name = name;
    }

    
    if (req.file) {
      updateData.avatar = req.file.path; 
    }

 
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No data provided to update",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      {
        new: true,          
        runValidators: true, 
      }
    ).select("-password -resetPasswordToken -resetPasswordExpire");

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};


export const updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select("+password");


    const isMatch = await user.matchPassword(currentPassword);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }


    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    next(error);
  }
};


export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

   
    if (!user) {
      return res.status(200).json({
        success: true,
        message: "If this email exists, a reset link has been sent",
      });
    }


    const rawToken = crypto.randomBytes(32).toString("hex");

   
    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = Date.now() + 60 * 60 * 1000; 
    await user.save({ validateBeforeSave: false });

  
    const resetURL = `${process.env.FRONTEND_URL}/reset-password/${rawToken}`;

    await sendEmail({
      to: user.email,
      subject: "Password Reset Request - Learnova",
      html: `
        <h2>Password Reset Request</h2>
        <p>You requested to reset your password.</p>
        <p>Click the link below to reset it:</p>
        <a href="${resetURL}" style="
          background: #6c63ff;
          color: white;
          padding: 12px 24px;
          border-radius: 6px;
          text-decoration: none;
        ">
          Reset Password
        </a>
        <p>This link expires in <strong>1 hour</strong>.</p>
        <p>If you didn't request this, ignore this email.</p>
      `,
    });

    res.status(200).json({
      success: true,
      message: "If this email exists, a reset link has been sent",
    });
  } catch (error) {

    if (req.user) {
      req.user.resetPasswordToken = null;
      req.user.resetPasswordExpire = null;
      await req.user.save({ validateBeforeSave: false });
    }
    next(error);
  }
};



export const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;


    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

   
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }, // $gt = greater than
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

   
    user.password = newPassword;

 
    user.resetPasswordToken = null;
    user.resetPasswordExpire = null;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Password reset successfully, please login",
    });
  } catch (error) {
    next(error);
  }
};



export const uploadUserFile = async (req, res, next) => {
  try {
   
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

   
    const fileUrl = req.file.path;
    const fileType = req.file.mimetype;

    res.status(200).json({
      success: true,
      message: "File uploaded successfully",
      data: {
        url: fileUrl,
        type: fileType,
        originalName: req.file.originalname,
      },
    });
  } catch (error) {
    next(error);
  }
};