import User from "../models/User.model.js";
import CV from "../models/Cv.model.js";
import Payment from "../models/Payment.model.js";
import { PLANS, MIME_TO_FILETYPE } from "../config/helpers.config.js";
import {
  getToken,
  createOrder,
  createPaymentKey,
  getCheckoutUrl,
} from "../config/paymob.js";
import asyncHandler from "express-async-handler";

export const getProfile = asyncHandler(async (req, res) => {
  const cvsRelated = await CV.find({ userId: req.user._id });

  const data = {
    ...req.user.toObject(),
    cvs: cvsRelated,
  };
  res.status(200).json({
    success: true,
    data,
  });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { name } = req.body;

  const updateData = {};

  if (name) updateData.name = name;

  if (req.file) updateData.avatar = req.file.path;

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({
      success: false,
      message: "No data provided to update",
    });
  }
  const user = await User.findByIdAndUpdate(req.user._id, updateData, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    data: user,
  });
});

export const updatePassword = asyncHandler(async (req, res) => {
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
});

export const uploadUserFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "No file uploaded. Please attach a PDF, DOC, or DOCX.",
    });
  }

  const fileType = MIME_TO_FILETYPE[req.file.mimetype];

  const cv = await CV.create({
    userId: req.user._id,
    originalFile: {
      url: req.file.path,
      publicId: req.file.filename,
      fileType,
      fileName: req.file.originalname,
      fileSize: req.file.size,
    },
    processingStatus: "uploaded",
  });

  res.status(201).json({
    success: true,
    message: "File uploaded and saved successfully",
    data: {
      cvId: cv._id,
      url: cv.originalFile.url,
      fileType: cv.originalFile.fileType,
      fileName: cv.originalFile.fileName,
      fileSize: cv.originalFile.fileSize,
      status: cv.processingStatus,
      uploadedAt: cv.createdAt,
    },
  });
});

export const userUpdateSubscription = asyncHandler(async (req, res) => {
  const { plan } = req.body;
  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }
  if (!PLANS[plan]) {
    return res.status(400).json({
      success: false,
      message: "Invalid plan",
    });
  }

  user.plan = plan;
  user.maxToken = PLANS[plan].maxToken;

  await user.save();

  res.status(200).json({
    success: true,
    message: "Subscription updated successfully",
    data: user,
  });
});


//Payment
export const payWithPaymob = asyncHandler(async (req, res) => {
  const user = req.user;
  const { plan } = req.body;

  if (!PLANS[plan]) {
    return res.status(400).json({ success: false, message: "Invalid plan" });
  }

  const amount = PLANS[plan].price;

  if (amount === 0) {
    // Direct update for free plan
    user.plan = plan;
    user.maxToken = PLANS[plan].maxToken;
    await user.save();
    return res.status(200).json({
      success: true,
      message: "Successfully switched to Free plan",
    });
  }

  const token = await getToken();
  const order = await createOrder(token, amount);
  const paymentToken = await createPaymentKey(token, order.id, amount, user);

  const url = getCheckoutUrl(paymentToken);

  await Payment.create({
    user: user._id,
    orderId: order.id.toString(),
    plan,
    amount,
    status: "Pending",
  });

  res.json({
  success: true,
  url,
  orderId: order.id,
});
});

export const paymobWebhook = asyncHandler(async (req, res) => {
  console.log("WEBHOOK HIT 🔥");
  const data = req.body;

  const success = data?.obj?.success;
  const orderId = data?.obj?.order?.id?.toString();

  if (!orderId) {
    return res.sendStatus(400);
  }

  const payment = await Payment.findOne({ orderId });

  if (!payment) return res.sendStatus(404);

  if (payment.status === "Paid") {
    return res.json({ ok: true });
  }

  if (success) {
    payment.status = "Paid";
    await payment.save();

    const foundUser = await User.findById(payment.user);
    if (foundUser) {
      foundUser.plan = payment.plan;
      foundUser.tokenUsage = 0;
      foundUser.maxToken = PLANS[payment.plan].maxToken;
      await foundUser.save();
    }
  } else {
    payment.status = "Failed";
    await payment.save();
  }

  res.json({ ok: true });
});

export const getPaymentStatus = asyncHandler(async (req, res) => {

    const payment = await Payment.findOne({
        orderId: req.params.orderId,
    });

    if (!payment) {
        return res.status(404).json({
            success: false,
        });
    }

    res.json({
        success: true,
        status: payment.status,
    });

});

//****** */

export const getMyAiUsage = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const user = await User.findById(userId)
    .select("tokenUsage maxToken aiCallsCount plan")
    .lean();

  // Aggregate per-CV AI usage for this user
  const cvStats = await CV.aggregate([
    { $match: { userId: userId } },
    {
      $group: {
        _id: null,
        totalEmbeddingTokens: { $sum: "$aiUsage.embeddingTokens" },
        totalPromptTokens: { $sum: "$aiUsage.promptTokens" },
        totalCompletionTokens: { $sum: "$aiUsage.completionTokens" },
        totalTokensSpent: { $sum: "$aiUsage.totalTokens" },
        avgResponseTimeMs: { $avg: "$aiUsage.responseTimeMs" },
        analyzedCVs: {
          $sum: { $cond: [{ $eq: ["$processingStatus", "analyzed"] }, 1, 0] },
        },
        totalCVs: { $sum: 1 },
      },
    },
  ]);

  const stats = cvStats[0] ?? {
    totalEmbeddingTokens: 0,
    totalPromptTokens: 0,
    totalCompletionTokens: 0,
    totalTokensSpent: 0,
    avgResponseTimeMs: 0,
    analyzedCVs: 0,
    totalCVs: 0,
  };

  res.status(200).json({
    success: true,
    data: {
      plan: user.plan,
      tokenUsage: user.tokenUsage,
      maxToken: user.maxToken,
      tokenUsagePercent: Math.round((user.tokenUsage / user.maxToken) * 100),
      aiCallsCount: user.aiCallsCount,
      breakdown: {
        embeddingTokens: stats.totalEmbeddingTokens,
        promptTokens: stats.totalPromptTokens,
        completionTokens: stats.totalCompletionTokens,
        totalTokensSpent: stats.totalTokensSpent,
      },
      avgResponseTimeMs: Math.round(stats.avgResponseTimeMs ?? 0),
      analyzedCVs: stats.analyzedCVs,
      totalCVs: stats.totalCVs,
    },
  });
});
