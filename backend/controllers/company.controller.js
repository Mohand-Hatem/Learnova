import asyncHandler from "express-async-handler";
import { searchCVsByQuery } from "../Vector/company.ai.js";
import CompanySearch from "../models/Companysearch.model.js";
import User from "../models/User.model.js";

const TOKEN_LIMIT_REACHED_MESSAGE =
  "Token limit reached. Your monthly token quota has been exhausted. Please wait for the monthly reset or upgrade your plan.";

// ══════════════════════════════════════════════════════════════════════════════
// COMPANY CHAT SEARCH
// ══════════════════════════════════════════════════════════════════════════════
export const chatSearchHandler = asyncHandler(async (req, res) => {
  const { message } = req.body;
  const companyId = req.user?._id;

  if (!message?.trim()) {
    return res.status(400).json({
      success: false,
      message: "Message is required",
    });
  }

  if (req.user?.role !== "company") {
    return res.status(403).json({
      success: false,
      message: "Access restricted to company accounts",
    });
  }

  const company = await User.findById(companyId).select("tokenUsage maxToken");

  if (!company) {
    return res
      .status(404)
      .json({ success: false, message: "Company account not found" });
  }

  if (company.tokenUsage >= company.maxToken) {
    return res.status(403).json({
      success: false,
      code: "TOKEN_LIMIT_REACHED",
      message: TOKEN_LIMIT_REACHED_MESSAGE,
      tokenUsage: company.tokenUsage,
      maxToken: company.maxToken,
    });
  }

  const searchResult = await searchCVsByQuery(message);

  const { usage } = searchResult;

  // ✅ نحدث رصيد الشركة بالتوكنز اللي اتستهلكت فعلياً في البحث ده
  if (usage?.totalTokens) {
    await User.findByIdAndUpdate(companyId, {
      $inc: { tokenUsage: Math.round(usage.totalTokens), aiCallsCount: 1 },
    });
  } else {
    await User.findByIdAndUpdate(companyId, {
      $inc: { aiCallsCount: 1 },
    });
  }

  // ✅ لو الرسالة بس تحية (Hello, Hi, مرحبا)
  if (searchResult.intent === "greeting") {
    return res.status(200).json({
      success: true,
      query: message,
      isGreeting: true,
      isOffTopic: false,
      message: searchResult.message,
      results: [],
      usage,
    });
  }

  // ✅ لو الرسالة مش بحث عن CVs (زي "إيه الطقس النهاردة؟")
  if (searchResult.intent === "reject") {
    return res.status(200).json({
      success: true,
      query: message,
      isGreeting: false,
      isOffTopic: true,
      message: searchResult.message,
      results: [],
      usage,
    });
  }

  const { results } = searchResult;

  // ✅ بحث حقيقي بس مفيش أي مرشح مرتبط فعلياً — نرجع فاضي مع رسالة واضحة،
  // ومنخزنش سجل بحث فاضي (مفيش داعي)
  if (!results.length) {
    return res.status(200).json({
      success: true,
      query: message,
      isGreeting: false,
      isOffTopic: false,
      resultsCount: 0,
      message:
        searchResult.message ?? "No matching candidates found for that search.",
      results: [],
      usage,
    });
  }

  // نخزن سجل البحث ده بس لما يكون فيه نتايج فعلية
  await CompanySearch.create({
    company: companyId,
    query: message,
    results: results.map((r) => ({
      cvId: r.cvId,
      name: r.name?.en ?? "Unknown",
      topSkills: r.topSkills,
      atsScore: r.atsScore,
      matchScore: r.matchScore,
      cvFileUrl: r.cvFileUrl ?? null,
    })),
    resultsCount: results.length,
  });

  return res.status(200).json({
    success: true,
    query: message,
    isGreeting: false,
    isOffTopic: false,
    resultsCount: results.length,
    results,
    usage,
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// GET COMPANY SEARCH HISTORY
// ══════════════════════════════════════════════════════════════════════════════
export const getSearchHistory = asyncHandler(async (req, res) => {
  if (req.user?.role !== "admin" && req.user?.role !== "company") {
    return res.status(403).json({
      success: false,
      message: "Access restricted to company or admin accounts",
    });
  }

  let query = {};

  if (req.user.role === "admin") {
    if (req.query.companyId) {
      query.company = req.query.companyId;
    }
  } else {
    query.company = req.user._id;
  }

  const history = await CompanySearch.find(query)
    .populate("company", "name email avatar")
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  return res.status(200).json({
    success: true,
    history,
  });
});
