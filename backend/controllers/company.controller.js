import asyncHandler from "express-async-handler";
import { searchCVsByQuery } from "../Vector/company.ai.js";
import CompanySearch from "../models/Companysearch.model.js";
import Conversation, {
  CONVERSATION_TTL_SECONDS,
} from "../models/Conversation.model.js";
import CV from "../models/Cv.model.js";
import User from "../models/User.model.js";

const TOKEN_LIMIT_REACHED_MESSAGE =
  "Token limit reached. Your monthly token quota has been exhausted. Please wait for the monthly reset or upgrade your plan.";

// ✅ عدد الرسائل (user + assistant) اللي بنفتكرها ونبعتها كسياق للمحادثة
const HISTORY_MESSAGE_LIMIT = 6;

const DEFAULT_FILTER_LIMIT = 25;
const MAX_FILTER_LIMIT = 50;

// ✅ بيضيف turn (رسالة المستخدم + رد المساعد) للمحادثة، ويمدد الـ TTL،
// وبيحدث آخر نتايج بحث فعلية لو البحث ده رجع نتايج جديدة (مش cached follow-up)
async function saveConversationTurn(
  conversation,
  userMessage,
  assistantMessage,
  { results } = {},
) {
  conversation.messages.push(
    { role: "user", content: userMessage },
    { role: "assistant", content: assistantMessage },
  );
  conversation.messages = conversation.messages.slice(
    -HISTORY_MESSAGE_LIMIT,
  );

  if (results?.length) {
    conversation.lastQuery = userMessage;
    conversation.lastResults = results;
  }

  conversation.expiresAt = new Date(
    Date.now() + CONVERSATION_TTL_SECONDS * 1000,
  );

  await conversation.save();
}

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

  // ✅ نحمّل (أو ننشئ) محادثة الشركة عشان نعرف نفهم follow-up questions
  let conversation = await Conversation.findOne({ company: companyId });
  if (!conversation) {
    conversation = new Conversation({ company: companyId });
  }

  const history = conversation.messages.slice(-HISTORY_MESSAGE_LIMIT);

  const searchResult = await searchCVsByQuery(message, {
    history,
    cachedResults: conversation.lastResults ?? [],
  });

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
    await saveConversationTurn(conversation, message, searchResult.message);
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
    await saveConversationTurn(conversation, message, searchResult.message);
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
  // ✅ عدد المرشحين اللي الموديل ماقدرش يحكم على خبرتهم بثقة (فلترة الخبرة
  // بس) — بنعرضها للشركة بوضوح بدل ما نستبعدهم أو نضمهم بصمت
  const uncertainCount = searchResult.uncertainCount ?? 0;

  // ✅ بحث حقيقي بس مفيش أي مرشح مرتبط فعلياً — نرجع فاضي مع رسالة واضحة،
  // ومنخزنش سجل بحث فاضي (مفيش داعي)
  if (!results.length) {
    let noResultsMessage =
      searchResult.message ?? "No matching candidates found for that search.";
    if (uncertainCount > 0) {
      noResultsMessage += ` ${uncertainCount} candidate(s) had unclear experience details in their CV and could not be confidently matched.`;
    }
    await saveConversationTurn(conversation, message, noResultsMessage);
    return res.status(200).json({
      success: true,
      query: message,
      isGreeting: false,
      isOffTopic: false,
      resultsCount: 0,
      message: noResultsMessage,
      ...(uncertainCount > 0 ? { uncertainCount } : {}),
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

  let assistantSummary = `Found ${results.length} matching candidate(s).`;
  if (uncertainCount > 0) {
    assistantSummary += ` ${uncertainCount} candidate(s) had unclear experience details in their CV and were excluded from this filter.`;
  }

  await saveConversationTurn(conversation, message, assistantSummary, {
    results,
  });

  return res.status(200).json({
    success: true,
    query: message,
    isGreeting: false,
    isOffTopic: false,
    resultsCount: results.length,
    results,
    ...(uncertainCount > 0 ? { uncertainCount } : {}),
    usage,
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// COMPANY STRUCTURED FILTER — deterministic, no LLM calls
// ══════════════════════════════════════════════════════════════════════════════
// ده مختلف تماماً عن chatSearchHandler: مفيش classifyIntent ولا embeddings
// ولا vector search — بس Mongo query عادي + مطابقة skills نصية بسيطة
// (زي rankSkillsByRelevance في company.ai.js) بدل regex غير آمن على الداتا
export const filterCVsHandler = asyncHandler(async (req, res) => {
  if (req.user?.role !== "company") {
    return res.status(403).json({
      success: false,
      message: "Access restricted to company accounts",
    });
  }

  const {
    skills = [],
    requireEducation = false,
    requireCertificate = false,
    requireProject = false,
    scope = "all",
    limit,
  } = req.body;

  if (!Array.isArray(skills)) {
    return res.status(400).json({
      success: false,
      message: "skills must be an array of strings",
    });
  }

  if (!["all", "lastSearch"].includes(scope)) {
    return res.status(400).json({
      success: false,
      message: 'scope must be "all" or "lastSearch"',
    });
  }

  const requestedSkills = skills
    .map((s) => String(s).trim().toLowerCase())
    .filter(Boolean);

  const effectiveLimit = Math.min(
    Number.isInteger(limit) && limit > 0 ? limit : DEFAULT_FILTER_LIMIT,
    MAX_FILTER_LIMIT,
  );

  // ✅ الفلاتر البوليانية (وجود قسم بالكامل أو لأ) بتتعمل على مستوى الـ
  // query نفسه — أرخص وأسرع من إننا نجيب كل الـ CVs ونفلترهم في الكود
  const query = { processingStatus: "analyzed" };
  if (requireEducation) query["parsedData.education.0"] = { $exists: true };
  if (requireCertificate)
    query["parsedData.certifications.0"] = { $exists: true };
  if (requireProject) query["parsedData.projects.0"] = { $exists: true };

  // ✅ scope="lastSearch": نقصر الفلترة على نفس الـ CVs اللي ظهرت في آخر
  // نتايج بحث AI للشركة دي، بدل كل قاعدة الـ CVs. بنجيب الـ cvIds بس من
  // المحادثة المخزنة ونعمل fresh CV.find عليهم — مش هنعتمد على الداتا
  // المخزنة في conversation.lastResults نفسها لأنها ماعندهاش
  // certifications/projects (اتخزنت بس experience/education للـ filter
  // القديم)، فـ CV.find هنا بيضمن بيانات كاملة ومحدثة
  if (scope === "lastSearch") {
    const conversation = await Conversation.findOne({
      company: req.user._id,
    }).select("lastResults");

    const cachedCvIds = conversation?.lastResults?.map((r) => r.cvId) ?? [];

    if (!cachedCvIds.length) {
      return res.status(200).json({
        success: true,
        resultsCount: 0,
        results: [],
        message:
          "No previous AI search results to filter. Search for candidates first, then apply filters.",
      });
    }

    query._id = { $in: cachedCvIds };
  }

  const cvs = await CV.find(query)
    .populate("userId", "name email")
    .select(
      "atsScore parsedData.education parsedData.certifications parsedData.projects parsedData.skills.technical userId originalFile.url originalFile.fileName originalFile.fileType",
    );

  let mapped = cvs.map((cv) => {
    const technical = cv.parsedData?.skills?.technical ?? [];

    // ✅ substring matching زي rankSkillsByRelevance، بس مع حد أدنى لطول
    // الكلمتين (2 حروف) قبل نعتبرهم substring match — من غير الشرط ده
    // سكيل قصير زي "C" ممكن يتطابق غلط مع أي كلمة تانية فيها الحرف ده
    // (مثال حقيقي: "C" كانت بتتطابق مع "React" لأن "react".includes("c"))
    const matchedSkills = requestedSkills.length
      ? technical.filter((t) => {
          const tLower = t.toLowerCase();
          return requestedSkills.some((s) => {
            if (tLower === s) return true;
            if (tLower.length < 2 || s.length < 2) return false;
            return tLower.includes(s) || s.includes(tLower);
          });
        })
      : [];

    return {
      cvId: cv._id.toString(),
      name: {
        en: cv.userId?.name?.en ?? "Unknown",
        ar: cv.userId?.name?.ar ?? "غير معروف",
      },
      email: cv.userId?.email ?? "",
      topSkills: technical,
      matchedSkills,
      matchCount: matchedSkills.length,
      atsScore: cv.atsScore ?? 0,
      education: cv.parsedData?.education ?? [],
      certifications: cv.parsedData?.certifications ?? [],
      projects: cv.parsedData?.projects ?? [],
      cvFileUrl: cv.originalFile?.url ?? null,
      cvFileName: cv.originalFile?.fileName ?? null,
      cvFileType: cv.originalFile?.fileType ?? null,
    };
  });

  // ✅ لو الشركة كتبت skills فعلاً، ده بيفلتر (لازم matchCount > 0) —
  // الـ "Skills" checkbox بيتحكم بس في الـ sort order مش الفلترة نفسها
  if (requestedSkills.length) {
    mapped = mapped.filter((c) => c.matchCount > 0);
  }

  const sortBySkillMatch = req.body.sortBySkillMatch === true;
  if (sortBySkillMatch && requestedSkills.length) {
    mapped.sort(
      (a, b) => b.matchCount - a.matchCount || b.atsScore - a.atsScore,
    );
  } else {
    mapped.sort((a, b) => b.atsScore - a.atsScore);
  }

  const results = mapped.slice(0, effectiveLimit);

  return res.status(200).json({
    success: true,
    resultsCount: results.length,
    results,
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
