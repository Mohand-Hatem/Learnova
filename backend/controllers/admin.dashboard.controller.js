import asyncHandler from "express-async-handler";
import User from "../models/User.model.js";
import CV from "../models/Cv.model.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const SPARKLINE_DAYS = 14;

const STATIC_AI_HEALTH = [
  { label: "Embedding API", value: 99.98 },
  { label: "RAG Pipeline", value: 99.4 },
  { label: "ATS Engine", value: 97.3 },
  { label: "Semantic Search", value: 92.8 },
];

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

function calcTrend(current, previous) {
  if (previous === 0) {
    const up = current > 0;
    return {
      trendPercent: up ? "+100%" : "0%",
      trendUp: up,
    };
  }

  const change = ((current - previous) / previous) * 100;
  const trendUp = change >= 0;
  const sign = trendUp ? "+" : "";

  return {
    trendPercent: `${sign}${change.toFixed(1)}%`,
    trendUp,
  };
}

async function countInRange(Model, match, from, to) {
  return Model.countDocuments({
    ...match,
    createdAt: { $gte: from, $lt: to },
  });
}

async function buildSparkline(Model, match = {}) {
  const today = startOfDay(new Date());
  const from = new Date(today.getTime() - (SPARKLINE_DAYS - 1) * DAY_MS);

  const rows = await Model.aggregate([
    { $match: { ...match, createdAt: { $gte: from } } },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
        },
        count: { $sum: 1 },
      },
    },
  ]);

  const map = new Map(rows.map((r) => [r._id, r.count]));
  const series = [];

  for (let i = SPARKLINE_DAYS - 1; i >= 0; i -= 1) {
    const day = new Date(today.getTime() - i * DAY_MS);
    const key = day.toISOString().slice(0, 10);
    series.push(map.get(key) ?? 0);
  }

  return series;
}

function mapCvStatus(cv) {
  if (cv.atsScore >= 80) return "Shortlisted";
  if (cv.processingStatus === "analyzed") return "Reviewing";
  if (cv.processingStatus === "failed") return "New";
  return "New";
}

function initialsFromName(name) {
  const en = name?.en?.trim() ?? "";
  const parts = en.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "CV";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export const getDashboard = asyncHandler(async (req, res) => {
  const now = new Date();
  const today = startOfDay(now);
  const weekAgo = new Date(today.getTime() - 7 * DAY_MS);
  const twoWeeksAgo = new Date(today.getTime() - 14 * DAY_MS);

  const [
    totalUsers,
    companies,
    totalCvs,
    aiAnalyses,
    avgAtsAgg,
    shortlisted,
    usersThisWeek,
    usersPrevWeek,
    companiesThisWeek,
    companiesPrevWeek,
    cvsThisWeek,
    cvsPrevWeek,
    aiThisWeek,
    aiPrevWeek,
    atsThisWeek,
    atsPrevWeek,
    shortThisWeek,
    shortPrevWeek,
    recentCvDocs,
    topSkillsAgg,
    userSparkline,
    cvSparkline,
    aiSparkline,
    companiesSparkline,
    atsSparkline,
    shortSparkline,
    activityUsers,
    activityCvs,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: "company" }),
    CV.countDocuments(),
    CV.countDocuments({ processingStatus: "analyzed" }),
    CV.aggregate([
      { $match: { atsScore: { $gt: 0 } } },
      { $group: { _id: null, avg: { $avg: "$atsScore" } } },
    ]),
    CV.countDocuments({ atsScore: { $gte: 80 } }),
    countInRange(User, {}, weekAgo, now),
    countInRange(User, {}, twoWeeksAgo, weekAgo),
    countInRange(User, { role: "company" }, weekAgo, now),
    countInRange(User, { role: "company" }, twoWeeksAgo, weekAgo),
    countInRange(CV, {}, weekAgo, now),
    countInRange(CV, {}, twoWeeksAgo, weekAgo),
    countInRange(CV, { processingStatus: "analyzed" }, weekAgo, now),
    countInRange(CV, { processingStatus: "analyzed" }, twoWeeksAgo, weekAgo),
    CV.aggregate([
      { $match: { atsScore: { $gt: 0 }, createdAt: { $gte: weekAgo } } },
      { $group: { _id: null, avg: { $avg: "$atsScore" } } },
    ]),
    CV.aggregate([
      {
        $match: {
          atsScore: { $gt: 0 },
          createdAt: { $gte: twoWeeksAgo, $lt: weekAgo },
        },
      },
      { $group: { _id: null, avg: { $avg: "$atsScore" } } },
    ]),
    countInRange(CV, { atsScore: { $gte: 80 } }, weekAgo, now),
    countInRange(CV, { atsScore: { $gte: 80 } }, twoWeeksAgo, weekAgo),
    CV.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("userId", "name avatar")
      .select("atsScore processingStatus parsedData createdAt")
      .lean(),
    CV.aggregate([
      { $match: { "parsedData.skills.0": { $exists: true } } },
      { $unwind: "$parsedData.skills" },
      { $group: { _id: "$parsedData.skills", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 },
    ]),
    buildSparkline(User),
    buildSparkline(CV),
    buildSparkline(CV, { processingStatus: "analyzed" }),
    buildSparkline(User, { role: "company" }),
    buildSparkline(CV, { atsScore: { $gt: 0 } }),
    buildSparkline(CV, { atsScore: { $gte: 80 } }),
    buildSparkline(User),
    buildSparkline(CV, { processingStatus: "analyzed" }),
  ]);

  const avgAts = avgAtsAgg[0]?.avg ?? 0;
  const avgAtsThis = atsThisWeek[0]?.avg ?? 0;
  const avgAtsPrev = atsPrevWeek[0]?.avg ?? 0;

  const stats = [
    {
      key: "totalUsers",
      title: "TOTAL USERS",
      value: formatNumber(totalUsers),
      ...calcTrend(usersThisWeek, usersPrevWeek),
      sparkline: userSparkline,
      icon: "bi-people",
      source: "dynamic",
    },
    {
      key: "companies",
      title: "COMPANIES",
      value: formatNumber(companies),
      ...calcTrend(companiesThisWeek, companiesPrevWeek),
      sparkline: companiesSparkline,
      icon: "bi-building",
      source: "dynamic",
    },
    {
      key: "cvsProcessed",
      title: "CVs PROCESSED",
      value: formatNumber(totalCvs),
      ...calcTrend(cvsThisWeek, cvsPrevWeek),
      sparkline: cvSparkline,
      icon: "bi-file-earmark-text",
      source: "dynamic",
    },
    {
      key: "aiAnalyses",
      title: "AI ANALYSES",
      value: formatNumber(aiAnalyses),
      ...calcTrend(aiThisWeek, aiPrevWeek),
      sparkline: aiSparkline,
      icon: "bi-stars",
      source: "dynamic",
    },
    {
      key: "avgAts",
      title: "AVG ATS SCORE",
      value: avgAts > 0 ? avgAts.toFixed(1) : "0",
      ...calcTrend(avgAtsThis, avgAtsPrev),
      sparkline: atsSparkline,
      icon: "bi-bullseye",
      source: "dynamic",
    },
    {
      key: "shortlisted",
      title: "SHORTLISTED",
      value: formatNumber(shortlisted),
      ...calcTrend(shortThisWeek, shortPrevWeek),
      sparkline: shortSparkline,
      icon: "bi-bookmark-star",
      source: "dynamic",
    },
  ].map(({ key, source, ...card }) => ({
    ...card,
    trendLabel: "vs last week",
  }));

  const recentCvs = recentCvDocs.map((cv) => {
    const user = cv.userId;
    const role =
      cv.parsedData?.experience?.[0]?.role?.trim() ||
      cv.parsedData?.experience?.[0]?.company?.trim() ||
      "—";

    return {
      name: user?.name?.en ?? "Unknown",
      role,
      ats: Math.round(cv.atsScore ?? 0),
      status: mapCvStatus(cv),
      avatar: initialsFromName(user?.name),
      source: "dynamic",
    };
  });

  const topSkills =
    topSkillsAgg.length > 0
      ? topSkillsAgg.map((s) => ({
          skill: s._id,
          count: s.count,
          source: "dynamic",
        }))
      : null;

  const labels = Array.from({ length: SPARKLINE_DAYS }, (_, i) => {
    const day = new Date(today.getTime() - (SPARKLINE_DAYS - 1 - i) * DAY_MS);
    return `Day ${String(i + 1).padStart(2, "0")}`;
  });

  res.status(200).json({
    success: true,
    data: {
      stats,
      recentCvs,
      topSkills,
      platformActivity: {
        labels,
        activeUsers: activityUsers,
        aiAnalyses: activityCvs,
        source: "dynamic",
      },
      aiHealth: {
        items: STATIC_AI_HEALTH,
        source: "static",
        reason: "No monitoring endpoint — placeholder metrics",
      },
      meta: {
        generatedAt: now.toISOString(),
        endpoints: {
          stats: "GET /admin/dashboard (aggregated from User + CV)",
          recentCvs: "GET /admin/dashboard",
          topSkills: "GET /admin/dashboard (CV.parsedData.skills)",
          platformActivity: "GET /admin/dashboard (daily User/CV counts)",
          aiHealth: "static — no backend health API",
        },
      },
    },
  });
});
