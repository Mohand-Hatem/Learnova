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
const MAX_RESULTS = 10;

// الرسالة اللي بترجع للشركة لو سألت حاجة برة نطاق النظام
const OUT_OF_SCOPE_MESSAGE =
  "I don't have knowledge about that — I'm only here to search our CV database and help you find the best candidates for your company. Try asking me about a role, skill, or experience you're looking for.";

// الرسالة اللي بترجع لو بس سلّم أو بدأ المحادثة (Hello, Hi, مرحبا...)
const GREETING_MESSAGE =
  "Hi! I'm your CV search assistant. Tell me what role, skill, or experience you're looking for and I'll find the best matching candidates from our database — for example: \"backend developer with Node.js experience\" or \"UI/UX designer with 3+ years\".";

// ══════════════════════════════════════════════════════════════════════════════
// TOKEN USAGE HELPER
// ══════════════════════════════════════════════════════════════════════════════
// كل استدعاء (intent / embedding / rerank) بيرجع usage خاص بيه، وبنجمعهم كلهم
// في نهاية البحث عشان نحدث tokenUsage بتاع الشركة بالمجموع الحقيقي.

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
// خطوة قبل أي vector search: نتأكد إن رسالة الشركة فعلاً بحث عن مرشحين/CVs،
// مش سؤال عشوائي (زي الطقس أو أي حاجة مالهاش علاقة بالنظام).

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

Rules:
- "cleanedQuery" should be a short, clear rewrite of what the user is looking
  for (only when intent is "search"), focused on skills/role/experience
  keywords. Leave it empty for "greeting" and "reject".
- Return ONLY valid JSON, no markdown, no code fences, no extra text.

{
  "intent": "search",
  "cleanedQuery": ""
}
`;

async function classifyIntent(userMessage) {
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
        { role: "user", content: userMessage },
      ],
      max_tokens: 200,
      temperature: 0,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`NVIDIA Intent error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  let raw = data.choices?.[0]?.message?.content ?? "{}";
  raw = raw.replace(/```json|```/g, "").trim();

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (parseErr) {
    void parseErr;
    // لو الموديل رجّع حاجة مش JSON سليم، نتعامل معاها كـ search عادي
    // (fail-open) عشان منمنعش بحث حقيقي بسبب خطأ parsing
    console.warn("[classifyIntent] failed to parse intent response, defaulting to search");
    parsed = { intent: "search", cleanedQuery: userMessage };
  }

  return { ...parsed, usage: data.usage };
}

// ══════════════════════════════════════════════════════════════════════════════
// SKILL RELEVANCE RANKING
// ══════════════════════════════════════════════════════════════════════════════
// بيرتب مهارات المرشح التقنية حسب قربها من كلمات سؤال الشركة، عشان لو الشركة
// سألت عن "React" مثلاً، تطلع React في أول الـ topSkills بدل ما تفضل في آخر
// الليستة زي ما اتخزنت وقت التحليل.

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
        score += 3; // تطابق كامل
      } else if (skillLower.includes(word) || word.includes(skillLower)) {
        score += 1; // تطابق جزئي
      }
    }

    return { skill, score, originalIndex };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.originalIndex - b.originalIndex; // نفس الـ score → نحافظ على الترتيب الأصلي
  });

  return scored.slice(0, 5).map((s) => s.skill);
}

// ✅ بيقطع النتايج عند أول "نطة" كبيرة في الـ matchScore — أي نتيجة بعد النطة
// دي بتبقى أضعف ارتباطاً بشكل واضح عن اللي قبلها، فمش بنرجعها
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
// مختلفة (زي "Electronics" مقابل "Web Development") — ممكن ترجع تشابه عام
// لأي نص تقني بغض النظر عن التخصص الفعلي. الخطوة دي بتبعت للموديل نفسه
// بيانات المرشحين (المهارات + مقتطف من الـ CV) ويحدد مين فعلاً مرتبط بالسؤال.

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
      // لو الـ rerank فشل لأي سبب، منمنعش البحث كله — نرجع النتايج زي ما هي
      // (fail-open) بدل ما نرجع فاضي بالغلط
      console.warn("[rerankByRelevance] LLM rerank failed, returning unfiltered candidates");
      return { candidates, usage: null };
    }

    const data = await response.json();
    responseUsage = data.usage ?? null;
    let raw = data.choices?.[0]?.message?.content ?? "{}";
    raw = raw.replace(/```json|```/g, "").trim();

    const { relevantCvIds } = JSON.parse(raw);
    if (!Array.isArray(relevantCvIds)) return { candidates, usage: responseUsage };

    const relevantSet = new Set(relevantCvIds);
    const filtered = candidates.filter((c) => relevantSet.has(c.cvId));

    // لو الـ LLM شال الكل بالغلط (edge case)، أحسن نرجع النتايج الأصلية
    // بدل ما نرجع فاضي تماماً
    return { candidates: filtered.length ? filtered : candidates, usage: responseUsage };
  } catch (err) {
    console.warn("[rerankByRelevance] error, returning unfiltered candidates:", err.message);
    return { candidates, usage: responseUsage };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPANY SEARCH — Cross-CV semantic search
// ══════════════════════════════════════════════════════════════════════════════

/**
 * @param {string} userQuery - رسالة الشركة
 * @param {object} options
 * @param {number} options.topK
 * @returns {{ intent: "search"|"greeting"|"reject", message?: string, results: Array, usage: object }}
 */
export async function searchCVsByQuery(userQuery, { topK = 50 } = {}) {
  const usageAcc = createUsageAccumulator();

  if (!userQuery || !userQuery.trim()) {
    return { intent: "reject", message: OUT_OF_SCOPE_MESSAGE, results: [], usage: usageAcc.get() };
  }

  // 1) نفهم قصد الرسالة الأول
  const intentResult = await classifyIntent(userQuery);
  usageAcc.add(intentResult.usage);

  if (intentResult.intent === "greeting") {
    return { intent: "greeting", message: GREETING_MESSAGE, results: [], usage: usageAcc.get() };
  }

  if (intentResult.intent !== "search") {
    return { intent: "reject", message: OUT_OF_SCOPE_MESSAGE, results: [], usage: usageAcc.get() };
  }

  const effectiveQuery = intentResult.cleanedQuery?.trim() || userQuery;

  // ✅ nv-embedqa-e5-v5 بيدعم input_type فعلياً، وبيحسن جودة التمييز
  // بين النتايج القريبة والبعيدة لما نستخدم "query" على سؤال البحث
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
    return { intent: "search", results: [], usage: usageAcc.get() };
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
    (id) => bestByCv.get(id).score >= MIN_MATCH_SCORE
  );
  if (!cvIds.length) return { intent: "search", results: [], usage: usageAcc.get() };

  // 5) بس الـ CVs اللي اتحللت فعلاً
  const cvs = await CV.find({
    _id: { $in: cvIds },
    processingStatus: "analyzed",
  })
    .populate("userId", "name email")
    .select(
      "atsScore parsedData.education parsedData.skills.technical userId originalFile.url originalFile.fileName originalFile.fileType"
    );

  console.log("[searchCVsByQuery] analyzed CVs matched:", cvs.length);

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
      // ✅ أعلى 5 مهارات تقنية مرتبة حسب قربها من سؤال الشركة
      topSkills: cv.parsedData?.skills?.technical?.length
        ? rankSkillsByRelevance(cv.parsedData.skills.technical, effectiveQuery)
        : [cv.parsedData?.education?.[0]?.degree ?? "N/A"],
      atsScore: cv.atsScore ?? 0,
      matchScore: bestMatch?.score ?? 0,
      matchedSnippet: bestMatch?.chunkText?.slice(0, 200) ?? "",
      // ✅ رابط ملف الـ CV نفسه عشان الشركة تقدر تفتحه/تحمله
      cvFileUrl: cv.originalFile?.url ?? null,
      cvFileName: cv.originalFile?.fileName ?? null,
      cvFileType: cv.originalFile?.fileType ?? null,
    };
  });

  // 7) طبقة تحقق ذكية: نبعت المرشحين للموديل يحدد مين مرتبط فعلاً بالسؤال
  //    (بتمسك حالات زي "Electronics" اللي الـ cosine similarity وحدها مش
  //    بتقدر تميزها بدقة كافية)
  const rerankResult = await rerankByRelevance(effectiveQuery, merged);
  usageAcc.add(rerankResult.usage);
  const relevanceChecked = rerankResult.candidates;

  // 8) ترتيب حسب أقرب match للسؤال الأول، وبعدين ATS score كعامل ثانوي
  const sortedByMatch = relevanceChecked.sort((a, b) => b.matchScore - a.matchScore);

  // نقطع عند أول نطة كبيرة في الـ matchScore — طبقة حماية إضافية
  const afterGapCutoff = applyRelativeGapCutoff(sortedByMatch);

  const sorted = afterGapCutoff
    .sort((a, b) => {
      if (Math.abs(b.matchScore - a.matchScore) > 0.02) {
        return b.matchScore - a.matchScore;
      }
      return b.atsScore - a.atsScore;
    })
    .slice(0, MAX_RESULTS);

  return { intent: "search", results: sorted, usage: usageAcc.get() };
}