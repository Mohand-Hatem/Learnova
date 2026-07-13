import { getEmbeddings, vectorIndex } from "./cv.ai.js";
import CV from "../models/Cv.model.js";
import Env from "../config/handelEnv.js";

const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";
const CHAT_MODEL = "openai/gpt-oss-20b";

// ✅ فلتر أولي خفيف بس — الهدف نستبعد الضوضاء الواضحة قبل ما نبعت للـ LLM،
// مش نعتمد عليه وحده في تحديد الصلة (ده شغل الـ LLM reranker تحت)
const MIN_MATCH_SCORE = 0.4;

// ✅ لو الفرق بين نتيجة والنتيجة اللي قبلها أكبر من كده، بنعتبرها "نطة" ونوقف
// هنا — يعني النتيجة دي وأي حاجة بعدها أضعف بشكل واضح ومش مرتبطة فعلياً
const RELATIVE_GAP_CUTOFF = 0.08;

// ✅ أقصى عدد نتايج نرجعها للشركة، حتى لو فيه أكتر من كده فوق الـ threshold
const MAX_RESULTS = 7;

// الرسالة اللي بترجع للشركة لو سألت حاجة برة نطاق النظام
const OUT_OF_SCOPE_MESSAGE =
  "I don't have knowledge about that — I'm only here to search our CV database and help you find the best candidates for your company. Try asking me about a role, skill, or experience you're looking for.";

// الرسالة اللي بترجع لو بس سلّم أو بدأ المحادثة (Hello, Hi, مرحبا...)
const GREETING_MESSAGE =
  'Hi! I\'m your CV search assistant. Tell me what role, skill, or experience you\'re looking for and I\'ll find the best matching candidates from our database — for example: "backend developer with Node.js experience" or "UI/UX designer with 3+ years".';

// ✅ الرسالة اللي بترجع لو البحث فعلي، بس مفيش أي CV مرتبط فعلياً بالموضوع
const NO_RELEVANT_CANDIDATES_MESSAGE =
  "We don't have any candidates matching that in our database yet. Try a different skill, role, or technology.";

// ══════════════════════════════════════════════════════════════════════════════
// TOKEN USAGE HELPER
// ══════════════════════════════════════════════════════════════════════════════

function createUsageAccumulator() {
  const usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

  return {
    add(u) {
      if (!u) return;
      usage.promptTokens += u.prompt_tokens ?? u.promptTokens ?? 0;
      usage.completionTokens += u.completion_tokens ?? u.completionTokens ?? 0;
      usage.totalTokens += u.total_tokens ?? u.totalTokens ?? 0;
    },
    get() {
      return { ...usage };
    },
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// INTENT CLASSIFICATION
// ══════════════════════════════════════════════════════════════════════════════

const INTENT_SYSTEM_PROMPT = `
You are an intent classifier for a company's CV/candidate search assistant.
Your ONLY job is to decide which of these three categories the user's message
falls into:

1. "search" — a request to find candidates/CVs (by skill, role, experience,
   education, track, etc). Example: "backend developer with Node.js".
2. "greeting" — a greeting or conversation opener with no search content yet.
   Example: "Hello", "Hi", "مرحبا", "how are you".
3. "reject" — anything else unrelated to candidate search (small talk beyond
   a greeting, weather, general knowledge, coding help, etc).

You will also be given the recent conversation history (if any) — use it to
understand follow-up messages that only make sense in context, e.g. "show me
the top 3 of those" after a previous search.

Rules:
- "cleanedQuery" should be a short, clear rewrite of what the user is looking
  for (only when intent is "search"), focused on skills/role/experience
  keywords. Leave it empty for "greeting" and "reject".
- "requestedCount" is the number of results the user explicitly asked for in
  THIS message (e.g. "top 3", "give me 5", "just 2" -> 3, 5, 2). Return it as
  an integer when the user asked for a specific number, otherwise null.
- Return ONLY valid JSON, no markdown, no code fences, no extra text.

{
  "intent": "search",
  "cleanedQuery": "",
  "requestedCount": null
}
`;

// ✅ Gate حتمي (مش LLM) لتحديد هل الرسالة فعلاً بترجع لنتايج سابقة أو لأ.
// أي رسالة فيها معايير بحث جديدة (سكيل/رول/خبرة) من غير إشارة صريحة
// للنتايج اللي قبلها لازم تعتبر بحث جديد بالكامل، حتى لو فيها رقم أو كلمة
// خبرة (زي "top 2 senior Angular developers") — عشان كده الاعتماد على
// regex/keywords ثابتة هنا مش على تخمين الموديل زي useCachedResults قديماً
const ENGLISH_REFERENCE_PATTERNS = [
  /\bthose\b/i,
  /\bthem\b/i,
  /\bthese\b/i,
  /\b(that|this|same)\s+(list|results?|candidates?|ones|search)\b/i,
  /\b(from|of|among)\s+(those|them|these)\b/i,
  /\bthe\s+(previous|prior|last)\s+(results?|search|list|candidates?)\b/i,
  /\bnarrow\s+(those|them|these|it)\s+down\b/i,
  /\b(above|earlier)\s+(results?|candidates?|list)\b/i,
];

// substring matches بدل regex \b — الـ word boundaries في JS مش موثوقة مع
// العربي، فالمقارنة النصية المباشرة أضمن هنا
const ARABIC_REFERENCE_PHRASES = [
  "من دول",
  "من الدول دي",
  "دول اللي",
  "اللي فوق",
  "من الي فوق",
  "من النتايج دي",
  "من القايمة دي",
  "من القائمة دي",
  "منهم",
  "اللي طلعوا",
];

function referencesPreviousResults(userMessage) {
  if (!userMessage) return false;

  if (ENGLISH_REFERENCE_PATTERNS.some((p) => p.test(userMessage))) {
    return true;
  }

  return ARABIC_REFERENCE_PHRASES.some((phrase) =>
    userMessage.includes(phrase),
  );
}

// ✅ تاني gate حتمي: بيحدد هل الـ follow-up ده عن فلترة بالخبرة تحديداً
// (يستدعي filterCandidatesByExperience) ولا مجرد قص عدد (top N) عادي
const ENGLISH_EXPERIENCE_KEYWORDS = [
  /\bsenior\b/i,
  /\bjunior\b/i,
  /\bmid[-\s]?level\b/i,
  /\bentry[-\s]?level\b/i,
  /\bexperience\b/i,
  /\bexperienced\b/i,
  /\byears?\b/i,
  /\bseniority\b/i,
];

const ARABIC_EXPERIENCE_KEYWORDS = [
  "خبرة",
  "خبره",
  "أقدمية",
  "اقدمية",
  "مبتدئ",
  "متمرس",
];

function isExperienceFilterQuery(userMessage) {
  if (!userMessage) return false;

  if (ENGLISH_EXPERIENCE_KEYWORDS.some((p) => p.test(userMessage))) {
    return true;
  }

  return ARABIC_EXPERIENCE_KEYWORDS.some((word) =>
    userMessage.includes(word),
  );
}

// ✅ fallback بسيط بالـ regex لو الموديل فشل يستخرج الرقم المطلوب من الرسالة
function extractRequestedCountFallback(userMessage) {
  if (!userMessage) return null;

  const patterns = [
    /\btop\s+(\d+)\b/i,
    /\bfirst\s+(\d+)\b/i,
    /\bjust\s+(\d+)\b/i,
    /\bonly\s+(\d+)\b/i,
    /\bgive\s+me\s+(\d+)\b/i,
    /\b(\d+)\s*(?:results?|candidates?|cvs?)\b/i,
  ];

  for (const pattern of patterns) {
    const match = userMessage.match(pattern);
    if (match) {
      const n = parseInt(match[1], 10);
      if (Number.isInteger(n) && n > 0) return n;
    }
  }

  return null;
}

// ✅ fail-open زي rerankByRelevance بالظبط: أي فشل هنا (network error،
// !response.ok، أو JSON مش سليم) ما ينفعش يوقف طلب الشركة كله بـ 500 —
// بنرجع "search" افتراضي بالرسالة الأصلية عشان الـ pipeline يكمل، بدل ما
// انقطاع مؤقت في NVIDIA API يوقف الـ chat بالكامل
async function classifyIntent(userMessage, history = []) {
  const historyMessages = history.map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content,
  }));

  try {
    const response = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Env.NVIDIA_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: CHAT_MODEL,
        messages: [
          { role: "system", content: INTENT_SYSTEM_PROMPT },
          ...historyMessages,
          { role: "user", content: userMessage },
        ],
        max_tokens: 200,
        temperature: 0,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      // ⚠️ fail-open حقيقي: الموديل فشل يرد أصلاً (network/API error)
      console.warn(
        `[classifyIntent] NVIDIA intent call failed (${response.status}), defaulting to search`,
      );
      return { intent: "search", cleanedQuery: userMessage, usage: null };
    }

    const data = await response.json();
    let raw = data.choices?.[0]?.message?.content ?? "{}";
    raw = raw.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (parseErr) {
      void parseErr;
      // ⚠️ fail-open حقيقي: الرد مش JSON سليم
      console.warn(
        "[classifyIntent] failed to parse intent response, defaulting to search. Raw:",
        raw,
      );
      return {
        intent: "search",
        cleanedQuery: userMessage,
        usage: data.usage,
      };
    }

    console.log("[classifyIntent] parsed intent:", parsed.intent, "| raw:", raw);

    // ⚠️ fail-open حقيقي: الـ JSON نفسه سليم بس مفيهوش "intent" من القيم
    // التلاتة المعروفة (undefined، مكتوبة غلط، أو الموديل لفّها في شكل
    // تاني). من غير الفحص ده، أي رد مش مضبوط الشكل كان بيتحسب "reject"
    // تلقائياً بالغلط — ده كان بيخلي رسايل بحث عادية زي "Looking for
    // TypeScript developers" ترجع "out of scope" رغم إنها مش reject حقيقي
    const VALID_INTENTS = ["search", "greeting", "reject"];
    if (!VALID_INTENTS.includes(parsed.intent)) {
      console.warn(
        `[classifyIntent] unexpected/missing intent value (got: ${JSON.stringify(parsed.intent)}), defaulting to search. Raw:`,
        raw,
      );
      return {
        intent: "search",
        cleanedQuery: userMessage,
        usage: data.usage,
      };
    }

    const requestedCount =
      Number.isInteger(parsed.requestedCount) && parsed.requestedCount > 0
        ? parsed.requestedCount
        : extractRequestedCountFallback(userMessage);

    return {
      ...parsed,
      requestedCount,
      usage: data.usage,
    };
  } catch (err) {
    // ⚠️ fail-open حقيقي: exception فعلي (network error, timeout, إلخ)
    console.warn(
      "[classifyIntent] error, defaulting to search:",
      err.message,
    );
    return { intent: "search", cleanedQuery: userMessage, usage: null };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SKILL RELEVANCE RANKING
// ══════════════════════════════════════════════════════════════════════════════

function rankSkillsByRelevance(skills, queryText) {
  if (!skills?.length) return [];
  if (!queryText) return skills.slice(0, 5);

  const queryWords = queryText
    .toLowerCase()
    .split(/[^a-z0-9+.#]+/i)
    .filter((w) => w.length > 1);

  const scored = skills.map((skill, originalIndex) => {
    const skillLower = skill.toLowerCase();
    let score = 0;

    for (const word of queryWords) {
      if (skillLower === word) {
        score += 3;
      } else if (skillLower.includes(word) || word.includes(skillLower)) {
        score += 1;
      }
    }

    return { skill, score, originalIndex };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.originalIndex - b.originalIndex;
  });

  return scored.slice(0, 5).map((s) => s.skill);
}

function applyRelativeGapCutoff(sortedByScore) {
  if (sortedByScore.length <= 1) return sortedByScore;

  for (let i = 1; i < sortedByScore.length; i++) {
    const gap = sortedByScore[i - 1].matchScore - sortedByScore[i].matchScore;
    if (gap >= RELATIVE_GAP_CUTOFF) {
      return sortedByScore.slice(0, i);
    }
  }

  return sortedByScore;
}

// ══════════════════════════════════════════════════════════════════════════════
// LLM RELEVANCE RE-RANKING
// ══════════════════════════════════════════════════════════════════════════════
// الـ vector similarity وحدها مش دايماً كافية للتمييز بين تخصصات كاملة
// مختلفة، أو بين "فيه candidates" و"مفيش candidates خالص" لموضوع معين.
// الخطوة دي بتبعت للموديل بيانات المرشحين ويحدد مين فعلاً مرتبط بالسؤال.

const RERANK_SYSTEM_PROMPT = `
You are a candidate relevance judge for a company's CV search assistant.
You will receive a search query and a list of candidates, each with their
top technical skills and a snippet from their CV.

Your job: return ONLY the cvId values of candidates who are genuinely
relevant to the search query — meaning their actual skills/domain match
what's being searched for, not just superficial text overlap.

Be strict about domain mismatches: e.g. if the query asks for "Electronics"
or "embedded systems" candidates, a web/frontend developer with no
electronics-related skills or projects is NOT relevant, even if their CV
mentions generic technical terms.

If NONE of the candidates are genuinely relevant to the query, return an
empty array — this is a valid and expected outcome, not an error. Do not
include a candidate just because the list would otherwise be empty.

Return ONLY valid JSON, no markdown, no extra text:
{
  "relevantCvIds": ["id1", "id2"]
}
`;

async function rerankByRelevance(queryText, candidates) {
  if (!candidates.length) return { candidates, usage: null };

  const candidatesSummary = candidates.map((c) => ({
    cvId: c.cvId,
    topSkills: c.topSkills,
    snippet: c.matchedSnippet,
  }));
  let responseUsage = null;

  try {
    const response = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Env.NVIDIA_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: CHAT_MODEL,
        messages: [
          { role: "system", content: RERANK_SYSTEM_PROMPT },
          {
            role: "user",
            content: `Search query: "${queryText}"\n\nCandidates:\n${JSON.stringify(candidatesSummary, null, 2)}`,
          },
        ],
        max_tokens: 500,
        temperature: 0,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      // ⚠️ fail-open حقيقي: الموديل فشل يرد أصلاً (network/API error)
      console.warn(
        "[rerankByRelevance] LLM rerank failed, returning unfiltered candidates",
      );
      return { candidates, usage: null };
    }

    const data = await response.json();
    responseUsage = data.usage ?? null;
    let raw = data.choices?.[0]?.message?.content ?? "{}";
    raw = raw.replace(/```json|```/g, "").trim();

    let relevantCvIds;
    try {
      ({ relevantCvIds } = JSON.parse(raw));
    } catch (parseErr) {
      void parseErr;
      // ⚠️ fail-open حقيقي: الرد مش JSON سليم
      console.warn(
        "[rerankByRelevance] failed to parse rerank response, returning unfiltered candidates",
      );
      return { candidates, usage: responseUsage };
    }

    if (!Array.isArray(relevantCvIds)) {
      // ⚠️ fail-open حقيقي: شكل الرد مش زي المتوقع
      return { candidates, usage: responseUsage };
    }

    const relevantSet = new Set(relevantCvIds);
    const filtered = candidates.filter((c) => relevantSet.has(c.cvId));

    // ✅ لو الموديل رد بنجاح وقال "مفيش حد مرتبط" (relevantCvIds فاضية)،
    // ده رد صحيح وموثوق ولازم نحترمه — منرجعش كل المرشحين تاني، لأن ده
    // بالظبط اللي بيخلي بحث عن حاجة مش موجودة (زي "RAG") يرجع كل الـ CVs
    // غلط لو مفيش أي واحد فعلاً مرتبط بالموضوع.
    return { candidates: filtered, usage: responseUsage };
  } catch (err) {
    // ⚠️ fail-open حقيقي: exception فعلي
    console.warn(
      "[rerankByRelevance] error, returning unfiltered candidates:",
      err.message,
    );
    return { candidates, usage: responseUsage };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// LLM EXPERIENCE-LEVEL FILTER — follow-up على نتايج مخزنة (cached)
// ══════════════════════════════════════════════════════════════════════════════
// الـ duration في الـ CV بيكون نص حر (مش سنين متعددة رقمياً)، فمفيش طريقة
// موثوقة نعتمد بيها على regex نفلتر بيه بالخبرة. بدل كده بنبعت المرشحين
// المخزنين (بحد أقصى 7) للموديل يحكم فعلياً على كل واحد، وبيقدر يرجع
// "uncertain" بدل ما يتخيل رقم مش موجود في الداتا.

const EXPERIENCE_FILTER_SYSTEM_PROMPT = `
You are an experience-level filter for a company's CV search assistant.
You will receive a filter request (e.g. "senior candidates", "5+ years of
experience", "entry level", "mid-level") and a list of candidates, each
with their work experience entries (role, duration, description) and
education.

Your job: classify each candidate's cvId into exactly one of three groups
based on whether their overall experience genuinely satisfies the filter
request:

- "matched": candidates whose experience clearly satisfies the filter
  request (e.g. duration/dates that clearly add up to "5+ years", or a
  work history that is unambiguously senior/junior/entry-level as asked).
- "notMatched": candidates whose experience clearly does NOT satisfy the
  filter request.
- "uncertain": candidates whose duration/experience text is too vague,
  incomplete, or ambiguous to confidently judge (e.g. missing dates, no
  clear total years, generic descriptions like "Worked as developer").
  Do NOT guess — if you cannot tell with reasonable confidence, put them
  here instead of forcing a matched/notMatched decision.

Rules:
- Judge only from the actual experience/education data given — a "Senior
  Developer" job title with just 1 year of actual duration listed is NOT
  automatically senior; infer from real duration/dates and description,
  not the title alone.
- Every cvId in the input MUST appear in exactly one of the three arrays.
- Return ONLY valid JSON, no markdown, no code fences, no extra text:

{
  "matchedCvIds": ["id1"],
  "notMatchedCvIds": ["id2"],
  "uncertainCvIds": ["id3"]
}
`;

function toCvIdString(cvId) {
  return cvId?.toString ? cvId.toString() : String(cvId);
}

async function filterCandidatesByExperience(filterQuery, candidates) {
  if (!candidates.length) {
    return { matched: candidates, uncertainCount: 0, usage: null };
  }

  const candidatesSummary = candidates.map((c) => ({
    cvId: toCvIdString(c.cvId),
    experience: c.experience,
    education: c.education,
  }));
  let responseUsage = null;

  try {
    const response = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Env.NVIDIA_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: CHAT_MODEL,
        messages: [
          { role: "system", content: EXPERIENCE_FILTER_SYSTEM_PROMPT },
          {
            role: "user",
            content: `Filter request: "${filterQuery}"\n\nCandidates:\n${JSON.stringify(candidatesSummary, null, 2)}`,
          },
        ],
        max_tokens: 500,
        temperature: 0,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      // ⚠️ fail-open حقيقي: الموديل فشل يرد أصلاً (network/API error)
      console.warn(
        "[filterCandidatesByExperience] LLM filter failed, returning unfiltered candidates",
      );
      return { matched: candidates, uncertainCount: 0, usage: null };
    }

    const data = await response.json();
    responseUsage = data.usage ?? null;
    let raw = data.choices?.[0]?.message?.content ?? "{}";
    raw = raw.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (parseErr) {
      void parseErr;
      // ⚠️ fail-open حقيقي: الرد مش JSON سليم
      console.warn(
        "[filterCandidatesByExperience] failed to parse filter response, returning unfiltered candidates",
      );
      return { matched: candidates, uncertainCount: 0, usage: responseUsage };
    }

    const { matchedCvIds, uncertainCvIds } = parsed;
    if (!Array.isArray(matchedCvIds) || !Array.isArray(uncertainCvIds)) {
      // ⚠️ fail-open حقيقي: شكل الرد مش زي المتوقع
      return { matched: candidates, uncertainCount: 0, usage: responseUsage };
    }

    const matchedSet = new Set(matchedCvIds);
    const uncertainSet = new Set(uncertainCvIds);
    const matched = candidates.filter((c) =>
      matchedSet.has(toCvIdString(c.cvId)),
    );
    const uncertainCount = candidates.filter((c) =>
      uncertainSet.has(toCvIdString(c.cvId)),
    ).length;

    // ✅ لو الموديل مش متأكد من مرشح معين، منعتبروش matched ولا منستبعده
    // بصمت — بنرجع العدد عشان الـ controller يعرضه للشركة بوضوح
    return { matched, uncertainCount, usage: responseUsage };
  } catch (err) {
    // ⚠️ fail-open حقيقي: exception فعلي
    console.warn(
      "[filterCandidatesByExperience] error, returning unfiltered candidates:",
      err.message,
    );
    return { matched: candidates, uncertainCount: 0, usage: responseUsage };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPANY SEARCH — Cross-CV semantic search
// ══════════════════════════════════════════════════════════════════════════════

export async function searchCVsByQuery(
  userQuery,
  { topK = 50, history = [], cachedResults = [] } = {},
) {
  const usageAcc = createUsageAccumulator();

  if (!userQuery || !userQuery.trim()) {
    return {
      intent: "reject",
      message: OUT_OF_SCOPE_MESSAGE,
      results: [],
      usage: usageAcc.get(),
    };
  }

  // 1) نفهم قصد الرسالة الأول (مع سياق المحادثة لو موجود)
  const intentResult = await classifyIntent(userQuery, history);
  usageAcc.add(intentResult.usage);

  if (intentResult.intent === "greeting") {
    return {
      intent: "greeting",
      message: GREETING_MESSAGE,
      results: [],
      usage: usageAcc.get(),
    };
  }

  if (intentResult.intent !== "search") {
    return {
      intent: "reject",
      message: OUT_OF_SCOPE_MESSAGE,
      results: [],
      usage: usageAcc.get(),
    };
  }

  const requestedCount = intentResult.requestedCount ?? null;
  const effectiveMaxResults = requestedCount ?? MAX_RESULTS;

  // ✅ follow-up حقيقي على نتايج سابقة — بيتحدد بشكل حتمي (regex/keywords)
  // مش عن طريق تخمين الموديل، عشان بحث جديد فيه رقم أو كلمة خبرة (زي "top 2
  // senior Angular developers") ميترجعش غلط على نتايج قديمة متخزنة
  if (referencesPreviousResults(userQuery) && cachedResults.length) {
    // بحد أقصى 7 مرشحين بس بيتبعتوا لأي LLM call تاني عشان الفلترة
    const candidatesForFilter = cachedResults.slice(0, 7);

    if (isExperienceFilterQuery(userQuery)) {
      const filterResult = await filterCandidatesByExperience(
        userQuery,
        candidatesForFilter,
      );
      usageAcc.add(filterResult.usage);

      return {
        intent: "search",
        results: filterResult.matched.slice(0, effectiveMaxResults),
        uncertainCount: filterResult.uncertainCount,
        usage: usageAcc.get(),
      };
    }

    const sliced = cachedResults.slice(0, effectiveMaxResults);
    return { intent: "search", results: sliced, usage: usageAcc.get() };
  }

  const effectiveQuery = intentResult.cleanedQuery?.trim() || userQuery;

  const embData = await getEmbeddings([effectiveQuery], "query");
  usageAcc.add(embData.usage);
  const vector = embData.embeddings[0];

  // 3) بحث في كل قاعدة بيانات الـ CVs
  const result = await vectorIndex.query({
    vector,
    topK,
    includeMetadata: true,
  });

  console.log("[searchCVsByQuery] raw matches:", result.length);

  if (!result.length) {
    return {
      intent: "search",
      message: NO_RELEVANT_CANDIDATES_MESSAGE,
      results: [],
      usage: usageAcc.get(),
    };
  }

  // 4) نجمع النتايج حسب الـ cvId، وناخد أحسن score لكل CV
  const bestByCv = new Map();
  for (const match of result) {
    const cvId = match.metadata?.cvId;
    if (!cvId) continue;

    if (!bestByCv.has(cvId) || match.score > bestByCv.get(cvId).score) {
      bestByCv.set(cvId, {
        score: match.score,
        chunkText: match.metadata.text,
      });
    }
  }

  const cvIds = [...bestByCv.keys()].filter(
    (id) => bestByCv.get(id).score >= MIN_MATCH_SCORE,
  );
  if (!cvIds.length) {
    return {
      intent: "search",
      message: NO_RELEVANT_CANDIDATES_MESSAGE,
      results: [],
      usage: usageAcc.get(),
    };
  }

  // 5) بس الـ CVs اللي اتحللت فعلاً
  const cvs = await CV.find({
    _id: { $in: cvIds },
    processingStatus: "analyzed",
  })
    .populate("userId", "name email")
    .select(
      "atsScore parsedData.education parsedData.experience parsedData.skills.technical userId originalFile.url originalFile.fileName originalFile.fileType",
    );

  console.log("[searchCVsByQuery] analyzed CVs matched:", cvs.length);

  if (!cvs.length) {
    return {
      intent: "search",
      message: NO_RELEVANT_CANDIDATES_MESSAGE,
      results: [],
      usage: usageAcc.get(),
    };
  }

  // 6) نبني الرد النهائي
  const merged = cvs.map((cv) => {
    const cvIdStr = cv._id.toString();
    const bestMatch = bestByCv.get(cvIdStr);

    return {
      cvId: cvIdStr,
      name: {
        en: cv.userId?.name?.en ?? "Unknown",
        ar: cv.userId?.name?.ar ?? "غير معروف",
      },
      email: cv.userId?.email ?? "",
      topSkills: cv.parsedData?.skills?.technical?.length
        ? rankSkillsByRelevance(cv.parsedData.skills.technical, effectiveQuery)
        : [cv.parsedData?.education?.[0]?.degree ?? "N/A"],
      atsScore: cv.atsScore ?? 0,
      matchScore: bestMatch?.score ?? 0,
      matchedSnippet: bestMatch?.chunkText?.slice(0, 200) ?? "",
      // ✅ متخزنين هنا (مش بس مستخدمين للعرض) عشان يبقوا متاحين لاحقاً لو
      // فيه follow-up بيفلتر على أساس الخبرة على النتايج المخزنة في المحادثة
      experience: cv.parsedData?.experience ?? [],
      education: cv.parsedData?.education ?? [],
      cvFileUrl: cv.originalFile?.url ?? null,
      cvFileName: cv.originalFile?.fileName ?? null,
      cvFileType: cv.originalFile?.fileType ?? null,
    };
  });

  // 7) طبقة تحقق ذكية: نبعت المرشحين للموديل يحدد مين مرتبط فعلاً بالسؤال
  const rerankResult = await rerankByRelevance(effectiveQuery, merged);
  usageAcc.add(rerankResult.usage);
  const relevanceChecked = rerankResult.candidates;

  // ✅ لو بعد التحقق الذكي مفيش أي مرشح فعلي مرتبط بالسؤال، نرجع فاضي
  // مع رسالة واضحة بدل ما نرجع نتايج غير مرتبطة
  if (!relevanceChecked.length) {
    return {
      intent: "search",
      message: NO_RELEVANT_CANDIDATES_MESSAGE,
      results: [],
      usage: usageAcc.get(),
    };
  }

  // 8) ترتيب حسب أقرب match للسؤال الأول، وبعدين ATS score كعامل ثانوي
  const sortedByMatch = relevanceChecked.sort(
    (a, b) => b.matchScore - a.matchScore,
  );
  const afterGapCutoff = applyRelativeGapCutoff(sortedByMatch);

  const sorted = afterGapCutoff
    .sort((a, b) => {
      if (Math.abs(b.matchScore - a.matchScore) > 0.02) {
        return b.matchScore - a.matchScore;
      }
      return b.atsScore - a.atsScore;
    })
    .slice(0, effectiveMaxResults);

  return { intent: "search", results: sorted, usage: usageAcc.get() };
}
