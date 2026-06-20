import User from "../models/User.model.js";
import { PLANS } from "../config/helpers.config.js";
import asyncHandler from "express-async-handler";
import CV from "../models/Cv.model.js";
import AdminActionLog from "../models/AdminActionLog.model.js";
import mongoose from "mongoose";

const formatTargetName = (user) => {
  if (!user?.name) return "Unknown";
  if (typeof user.name === "string") return user.name;
  return user.name.en || user.name.ar || "Unknown";
};

const logAdminAction = async (req, { action, targetUser, details = "" }) => {
  if (!req?.user?._id || req.user.role !== "admin") return;
  try {
    await AdminActionLog.create({
      actorId: req.user._id,
      action,
      targetUserId: targetUser?._id ?? null,
      targetName: targetUser ? formatTargetName(targetUser) : "",
      targetRole: targetUser?.role ?? "",
      details,
    });
  } catch (error) {
    console.error("Failed to write admin action log:", error);
  }
};

export const getOverviewStats = asyncHandler(async (req, res) => {
  // date boundaries
  const now = new Date();

  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const [
    userStats,
    cvStats,
    lastMonthUsers,
    lastMonthCVs,
    monthlyTrends,
    topSkills,
    recentCVs,
    topCompanies,
  ] = await Promise.all([

    // ── user counts: totals + role + plan breakdown + this-month count
    User.aggregate([
      {
        $facet: {
          byRole: [{ $group: { _id: "$role", count: { $sum: 1 } } }],
          byPlan: [{ $group: { _id: "$plan", count: { $sum: 1 } } }],
          total: [{ $count: "count" }],
          thisMonth: [
            { $match: { createdAt: { $gte: startOfThisMonth } } },
            { $count: "count" },
          ],
          lastMonth: [
            { $match: { createdAt: { $gte: startOfLastMonth, $lt: startOfThisMonth } } },
            { $count: "count" },
          ],
        },
      },
    ]),

    // ── CV counts + avg ATS + this-month CV count
    CV.aggregate([
      {
        $facet: {
          total: [{ $count: "count" }],
          byStatus: [{ $group: { _id: "$processingStatus", count: { $sum: 1 } } }],
          avgAtsScore: [
            { $match: { processingStatus: "analyzed", atsScore: { $gt: 0 } } },
            { $group: { _id: null, avg: { $avg: "$atsScore" } } },
          ],
          thisMonth: [
            { $match: { createdAt: { $gte: startOfThisMonth } } },
            { $count: "count" },
          ],
          lastMonth: [
            { $match: { createdAt: { $gte: startOfLastMonth, $lt: startOfThisMonth } } },
            { $count: "count" },
          ],
          aiMatchRate: [
            { $match: { processingStatus: "analyzed", atsScore: { $gt: 0 } } },
            { $group: { _id: null, rate: { $avg: { $divide: ["$atsScore", 100] } } } },
          ],
        },
      },
    ]),

    // ── last month user count for companies (% change)
    User.countDocuments({
      role: "company",
      createdAt: { $gte: startOfLastMonth, $lt: startOfThisMonth },
    }),

    // ── last month CV count
    CV.countDocuments({
      createdAt: { $gte: startOfLastMonth, $lt: startOfThisMonth },
    }),

    // ── 12-month trend: active users (registered) + AI analyses per month
    Promise.all([
      User.aggregate([
        { $match: { createdAt: { $gte: twelveMonthsAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      CV.aggregate([
        { $match: { processingStatus: "analyzed", updatedAt: { $gte: twelveMonthsAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$updatedAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]),

    // ── top 10 skills extracted from all analyzed CVs
    CV.aggregate([
      { $match: { processingStatus: "analyzed" } },
      { $unwind: "$parsedData.skills.technical" },
      { $group: { _id: "$parsedData.skills.technical", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $project: { _id: 0, skill: "$_id", count: 1 } },
    ]),

    // ── 10 most recent analyzed CVs with user info
    CV.find({ processingStatus: "analyzed" })
      .sort({ updatedAt: -1 })
      .limit(10)
      .populate("userId", "name avatar")
      .select("userId atsScore updatedAt originalFile.fileName")
      .lean(),

    // ── top 5 companies by number of CVs uploaded
    CV.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
          pipeline: [{ $match: { role: "company" } }, { $project: { name: 1, avatar: 1 } }],
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: false } },
      { $group: { _id: "$user._id", name: { $first: "$user.name" }, avatar: { $first: "$user.avatar" }, cvCount: { $sum: 1 } } },
      { $sort: { cvCount: -1 } },
      { $limit: 5 },
      { $project: { _id: 0, name: 1, avatar: 1, cvCount: 1 } },
    ]),
  ]);

  // ── helpers: % change vs last month
  const pctChange = (current, previous) => {
    if (!previous) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const roles = Object.fromEntries(userStats[0].byRole.map((r) => [r._id, r.count]));
  const plans = Object.fromEntries(userStats[0].byPlan.map((p) => [p._id, p.count]));
  const cvStatuses = Object.fromEntries(cvStats[0].byStatus.map((s) => [s._id, s.count]));

  const thisMonthUsers = userStats[0].thisMonth[0]?.count ?? 0;
  const prevMonthUsers = userStats[0].lastMonth[0]?.count ?? 0;
  const thisMonthCompanies = 0; // approximated via lastMonthUsers param above
  const thisMonthCVs = cvStats[0].thisMonth[0]?.count ?? 0;
  const prevMonthCVs = cvStats[0].lastMonth[0]?.count ?? 0;

  const [usersPerMonth, analysesPerMonth] = monthlyTrends;

  res.status(200).json({
    success: true,
    data: {
      // ── stat cards
      stats: {
        totalUsers: {
          value: roles["user"] ?? 0,
          changePercent: pctChange(thisMonthUsers, prevMonthUsers),
        },
        totalAdmins: {
          value: roles["admin"] ?? 0,
          changePercent: 0,
        },
        totalCompanies: {
          value: roles["company"] ?? 0,
          changePercent: pctChange(roles["company"] ?? 0, lastMonthUsers),
        },
        totalCVs: {
          value: cvStats[0].total[0]?.count ?? 0,
          changePercent: pctChange(thisMonthCVs, prevMonthCVs),
        },
        avgAtsScore: {
          value: parseFloat((cvStats[0].avgAtsScore[0]?.avg ?? 0).toFixed(1)),
        },
        aiMatchRate: {
          value: parseFloat(((cvStats[0].aiMatchRate[0]?.rate ?? 0) * 100).toFixed(1)),
        },
      },

      // ── plan donut chart
      byPlan: {
        free: plans["Free"] ?? 0,
        pro: plans["Pro"] ?? 0,
        enterprise: plans["Enterprise"] ?? 0,
      },

      // ── CV status breakdown
      cvsByStatus: {
        uploaded: cvStatuses["uploaded"] ?? 0,
        processing: cvStatuses["processing"] ?? 0,
        analyzed: cvStatuses["analyzed"] ?? 0,
        failed: cvStatuses["failed"] ?? 0,
      },

      // ── line chart: 12 months
      charts: {
        activeUsersPerMonth: usersPerMonth,
        aiAnalysesPerMonth: analysesPerMonth,
      },

      // ── top skills table
      topSkills,

      // ── recent CVs table
      recentCVs: recentCVs.map((cv) => ({
        candidate: cv.userId?.name ?? { en: "Unknown", ar: "غير معروف" },
        avatar: cv.userId?.avatar ?? null,
        fileName: cv.originalFile?.fileName ?? "",
        atsScore: cv.atsScore,
        analyzedAt: cv.updatedAt,
      })),

      // ── top companies by CV uploads
      topCompanies,
    },
  });
});

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

  await logAdminAction(req, {
    action: "delete_user",
    targetUser: user,
    details: "Deleted account",
  });

  res.status(200).json({
    success: true,
    message: "User deleted successfully",
  });
});

export const updateUserRole = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { role } = req.body;

  const before = await User.findById(id).select("-password");
  if (!before) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  const user = await User.findByIdAndUpdate(id, { role }, { new: true }).select(
    "-password",
  );

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  await logAdminAction(req, {
    action: "update_user_role",
    targetUser: user,
    details: `Role changed from ${before.role} to ${role}`,
  });

  res.status(200).json({
    success: true,
    message: "Role updated successfully",
    data: user,
  });
});

export const getAiStats = asyncHandler(async (req, res) => {
  // OpenAI pricing per 1M tokens (update if pricing changes)
  const PRICING = {
    embeddingPerM: 0.02,   // text-embedding-3-small
    promptPerM: 0.15,      // gpt-4o-mini input
    completionPerM: 0.60,  // gpt-4o-mini output
  };

  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const [platformTotals, thisMonthTotals, lastMonthTotals, monthlyTrends, topUsers] =
    await Promise.all([

      // ── all-time platform totals + success rate
      CV.aggregate([
        {
          $group: {
            _id: null,
            totalEmbeddingTokens: { $sum: "$aiUsage.embeddingTokens" },
            totalPromptTokens: { $sum: "$aiUsage.promptTokens" },
            totalCompletionTokens: { $sum: "$aiUsage.completionTokens" },
            totalTokensSpent: { $sum: "$aiUsage.totalTokens" },
            avgResponseTimeMs: { $avg: "$aiUsage.responseTimeMs" },
            totalAnalyzed: {
              $sum: { $cond: [{ $eq: ["$processingStatus", "analyzed"] }, 1, 0] },
            },
            totalFailed: {
              $sum: { $cond: [{ $eq: ["$processingStatus", "failed"] }, 1, 0] },
            },
            totalProcessed: {
              $sum: {
                $cond: [
                  { $in: ["$processingStatus", ["analyzed", "failed"]] },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),

      // ── this month totals (for % change cards)
      CV.aggregate([
        { $match: { "aiUsage.analyzedAt": { $gte: startOfThisMonth } } },
        {
          $group: {
            _id: null,
            totalTokens: { $sum: "$aiUsage.totalTokens" },
            avgResponseTimeMs: { $avg: "$aiUsage.responseTimeMs" },
            analyzed: { $sum: { $cond: [{ $eq: ["$processingStatus", "analyzed"] }, 1, 0] } },
            failed: { $sum: { $cond: [{ $eq: ["$processingStatus", "failed"] }, 1, 0] } },
          },
        },
      ]),

      // ── last month totals (for % change cards)
      CV.aggregate([
        {
          $match: {
            "aiUsage.analyzedAt": { $gte: startOfLastMonth, $lt: startOfThisMonth },
          },
        },
        {
          $group: {
            _id: null,
            totalTokens: { $sum: "$aiUsage.totalTokens" },
            avgResponseTimeMs: { $avg: "$aiUsage.responseTimeMs" },
            analyzed: { $sum: { $cond: [{ $eq: ["$processingStatus", "analyzed"] }, 1, 0] } },
            failed: { $sum: { $cond: [{ $eq: ["$processingStatus", "failed"] }, 1, 0] } },
          },
        },
      ]),

      // ── 12-month time-series: AI calls, tokens, avg response time, success rate
      CV.aggregate([
        { $match: { "aiUsage.analyzedAt": { $gte: twelveMonthsAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$aiUsage.analyzedAt" } },
            aiCalls: { $sum: 1 },
            totalTokens: { $sum: "$aiUsage.totalTokens" },
            avgResponseTimeMs: { $avg: "$aiUsage.responseTimeMs" },
            analyzed: {
              $sum: { $cond: [{ $eq: ["$processingStatus", "analyzed"] }, 1, 0] },
            },
            failed: {
              $sum: { $cond: [{ $eq: ["$processingStatus", "failed"] }, 1, 0] },
            },
          },
        },
        {
          $addFields: {
            successRate: {
              $cond: [
                { $gt: [{ $add: ["$analyzed", "$failed"] }, 0] },
                {
                  $multiply: [
                    { $divide: ["$analyzed", { $add: ["$analyzed", "$failed"] }] },
                    100,
                  ],
                },
                0,
              ],
            },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // ── top 10 users by token consumption
      CV.aggregate([
        { $match: { "aiUsage.totalTokens": { $gt: 0 } } },
        {
          $group: {
            _id: "$userId",
            totalTokens: { $sum: "$aiUsage.totalTokens" },
            aiCalls: { $sum: { $cond: [{ $eq: ["$processingStatus", "analyzed"] }, 1, 0] } },
            avgResponseTimeMs: { $avg: "$aiUsage.responseTimeMs" },
          },
        },
        { $sort: { totalTokens: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "user",
            pipeline: [{ $project: { name: 1, email: 1, plan: 1, avatar: 1 } }],
          },
        },
        { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 0,
            name: "$user.name",
            email: "$user.email",
            plan: "$user.plan",
            avatar: "$user.avatar",
            totalTokens: 1,
            aiCalls: 1,
            avgResponseTimeMs: { $round: ["$avgResponseTimeMs", 0] },
          },
        },
      ]),
    ]);

  const pctChange = (current, previous) => {
    if (!previous) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const p = platformTotals[0] ?? {};
  const tm = thisMonthTotals[0] ?? {};
  const lm = lastMonthTotals[0] ?? {};

  const totalAiCalls = await User.aggregate([
    { $group: { _id: null, total: { $sum: "$aiCallsCount" } } },
  ]);

  // estimated cost in USD
  const estimatedCost = parseFloat((
    ((p.totalEmbeddingTokens ?? 0) / 1_000_000) * PRICING.embeddingPerM +
    ((p.totalPromptTokens ?? 0) / 1_000_000) * PRICING.promptPerM +
    ((p.totalCompletionTokens ?? 0) / 1_000_000) * PRICING.completionPerM
  ).toFixed(4));

  const successRate =
    p.totalProcessed > 0
      ? parseFloat(((p.totalAnalyzed / p.totalProcessed) * 100).toFixed(1))
      : 0;

  const tmSuccessRate =
    (tm.analyzed ?? 0) + (tm.failed ?? 0) > 0
      ? parseFloat(((tm.analyzed / ((tm.analyzed ?? 0) + (tm.failed ?? 0))) * 100).toFixed(1))
      : 0;
  const lmSuccessRate =
    (lm.analyzed ?? 0) + (lm.failed ?? 0) > 0
      ? parseFloat(((lm.analyzed / ((lm.analyzed ?? 0) + (lm.failed ?? 0))) * 100).toFixed(1))
      : 0;

  res.status(200).json({
    success: true,
    data: {
      // ── stat cards
      stats: {
        totalAiCalls: {
          value: totalAiCalls[0]?.total ?? 0,
          changePercent: pctChange(tm.analyzed ?? 0, lm.analyzed ?? 0),
        },
        tokenSpend: {
          value: p.totalTokensSpent ?? 0,
          changePercent: pctChange(tm.totalTokens ?? 0, lm.totalTokens ?? 0),
          estimatedCostUSD: estimatedCost,
        },
        avgResponseTime: {
          valueMs: Math.round(p.avgResponseTimeMs ?? 0),
          changePercent: pctChange(
            Math.round(tm.avgResponseTimeMs ?? 0),
            Math.round(lm.avgResponseTimeMs ?? 0),
          ),
        },
        successRate: {
          value: successRate,
          changePercent: pctChange(tmSuccessRate, lmSuccessRate),
        },
      },

      // ── token type breakdown (for donut chart)
      tokenBreakdown: {
        embedding: p.totalEmbeddingTokens ?? 0,
        prompt: p.totalPromptTokens ?? 0,
        completion: p.totalCompletionTokens ?? 0,
      },

      // ── 12-month time-series (for all line charts)
      charts: {
        // each item: { _id, aiCalls, totalTokens, avgResponseTimeMs, successRate }
        monthly: monthlyTrends,
      },

      // ── top consumers table
      topUsers,
    },
  });
});

export const updateUserPlan = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { plan } = req.body;

  const maxToken = PLANS[plan].maxToken;
  const before = await User.findById(id).select("-password");
  if (!before) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

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

  await logAdminAction(req, {
    action: "update_user_plan",
    targetUser: user,
    details: `Plan changed from ${before.plan} to ${plan}`,
  });

  res.status(200).json({
    success: true,
    message: "Plan updated successfully",
    data: user,
  });
});

export const toggleBanUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id).select('-password');

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  user.isBlocked = !user.isBlocked;
  await user.save();

  await logAdminAction(req, {
    action: user.isBlocked ? "ban_user" : "unban_user",
    targetUser: user,
    details: user.isBlocked ? "Blocked account" : "Unblocked account",
  });

  res.status(200).json({
    success: true,
    message: user.isBlocked ? 'User banned successfully' : 'User unbanned successfully',
    data: user,
  });
});

export const getAdminActionHistory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid admin id",
    });
  }
  const actorId = new mongoose.Types.ObjectId(id);
  const rangeDays = Math.min(Math.max(Number(req.query.days) || 14, 7), 90);
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - (rangeDays - 1));
  fromDate.setHours(0, 0, 0, 0);

  const [actions, dailyCounts, actionTypeBreakdown] = await Promise.all([
    AdminActionLog.find({ actorId: id })
      .sort({ createdAt: -1 })
      .limit(60)
      .lean(),
    AdminActionLog.aggregate([
      { $match: { actorId, createdAt: { $gte: fromDate } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    AdminActionLog.aggregate([
      { $match: { actorId } },
      { $group: { _id: "$action", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 },
    ]),
  ]);

  const countsByDay = new Map(dailyCounts.map((item) => [item._id, item.count]));
  const series = Array.from({ length: rangeDays }, (_, index) => {
    const day = new Date(fromDate);
    day.setDate(fromDate.getDate() + index);
    const key = day.toISOString().slice(0, 10);
    return {
      date: key,
      count: countsByDay.get(key) ?? 0,
    };
  });

  res.status(200).json({
    success: true,
    data: {
      rangeDays,
      series,
      actions: actions.map((item) => ({
        id: item._id,
        action: item.action,
        details: item.details,
        targetName: item.targetName,
        targetRole: item.targetRole,
        createdAt: item.createdAt,
      })),
      actionTypeBreakdown: actionTypeBreakdown.map((item) => ({
        action: item._id,
        count: item.count,
      })),
    },
  });
});