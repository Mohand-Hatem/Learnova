import asyncHandler from "express-async-handler";
import { searchCVsByQuery } from "../Vector/company.ai.js";
import CompanySearch from "../models/Companysearch.model.js";

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

  const searchResult = await searchCVsByQuery(message);

  // ✅ لو الرسالة بس تحية (Hello, Hi, مرحبا) — رد ترحيبي مختلف عن الـ reject
  if (searchResult.intent === "greeting") {
    return res.status(200).json({
      success: true,
      query: message,
      isGreeting: true,
      isOffTopic: false,
      message: searchResult.message,
      results: [],
    });
  }

  // ✅ لو الرسالة مش بحث عن CVs (زي "إيه الطقس النهاردة؟")
  // نرجع رد ثابت من غير ما نعمل vector search أو نخزن سجل بحث
  if (searchResult.intent === "reject") {
    return res.status(200).json({
      success: true,
      query: message,
      isGreeting: false,
      isOffTopic: true,
      message: searchResult.message,
      results: [],
    });
  }

  const { results } = searchResult;

  // نخزن سجل البحث ده بس لما يكون بحث حقيقي
  await CompanySearch.create({
    company: companyId,
    query: message,
    results: results.map((r) => ({
      cvId: r.cvId,
      name: r.name?.en ?? "Unknown",
      track: r.track,
      atsScore: r.atsScore,
      matchScore: r.matchScore,
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
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// GET COMPANY SEARCH HISTORY
// ══════════════════════════════════════════════════════════════════════════════
export const getSearchHistory = asyncHandler(async (req, res) => {
  const companyId = req.user?._id;

  const history = await CompanySearch.find({ company: companyId })
    .sort({ createdAt: -1 })
    .limit(50);

  return res.status(200).json({
    success: true,
    history,
  });
});