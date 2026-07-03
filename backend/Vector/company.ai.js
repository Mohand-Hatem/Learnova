import { getEmbeddings, vectorIndex } from "./cv.ai.js";
import CV from "../models/Cv.model.js";
import Env from "../config/handelEnv.js";

const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";
const CHAT_MODEL = "openai/gpt-oss-20b";

// الرسالة اللي بترجع للشركة لو سألت حاجة برة نطاق النظام
const OUT_OF_SCOPE_MESSAGE =
  "I don't have knowledge about that — I'm only here to search our CV database and help you find the best candidates for your company. Try asking me about a role, skill, or experience you're looking for.";

// الرسالة اللي بترجع لو بس سلّم أو بدأ المحادثة (Hello, Hi, مرحبا...)
const GREETING_MESSAGE =
  "Hi! I'm your CV search assistant. Tell me what role, skill, or experience you're looking for and I'll find the best matching candidates from our database — for example: \"backend developer with Node.js experience\" or \"UI/UX designer with 3+ years\".";

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

  try {
    return JSON.parse(raw);
  } catch (parseErr) {
    void parseErr;
    // لو الموديل رجّع حاجة مش JSON سليم، نتعامل معاها كـ search عادي
    // (fail-open) عشان منمنعش بحث حقيقي بسبب خطأ parsing
    console.warn("[classifyIntent] failed to parse intent response, defaulting to search");
    return { intent: "search", cleanedQuery: userMessage };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPANY SEARCH — Cross-CV semantic search
// ══════════════════════════════════════════════════════════════════════════════

/**
 * @param {string} userQuery - رسالة الشركة
 * @param {object} options
 * @param {number} options.topK
 * @returns {{ intent: "search"|"reject", message?: string, results: Array }}
 */
export async function searchCVsByQuery(userQuery, { topK = 30 } = {}) {
  if (!userQuery || !userQuery.trim()) {
    return { intent: "reject", message: OUT_OF_SCOPE_MESSAGE, results: [] };
  }

  // 1) نفهم قصد الرسالة الأول
  const intentResult = await classifyIntent(userQuery);

  if (intentResult.intent === "greeting") {
    return { intent: "greeting", message: GREETING_MESSAGE, results: [] };
  }

  if (intentResult.intent !== "search") {
    return { intent: "reject", message: OUT_OF_SCOPE_MESSAGE, results: [] };
  }

  const effectiveQuery = intentResult.cleanedQuery?.trim() || userQuery;

  // 2) نحول الرسالة لـ embedding واحد (من غير chunking)
  const embData = await getEmbeddings([effectiveQuery], "query");
  const vector = embData.embeddings[0];

  // 3) بحث في كل قاعدة بيانات الـ CVs
  const result = await vectorIndex.query({
    vector,
    topK,
    includeMetadata: true,
  });

  console.log("[searchCVsByQuery] raw matches:", result.length);

  if (!result.length) {
    return { intent: "search", results: [] };
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

  const cvIds = [...bestByCv.keys()];
  if (!cvIds.length) return { intent: "search", results: [] };

  // 5) بس الـ CVs اللي اتحللت فعلاً
  const cvs = await CV.find({
    _id: { $in: cvIds },
    processingStatus: "analyzed",
  })
    .populate("userId", "name email")
    .select("atsScore parsedData.education parsedData.skills userId");

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
      track:
        cv.parsedData?.skills?.technical?.[0] ??
        cv.parsedData?.education?.[0]?.degree ??
        "N/A",
      atsScore: cv.atsScore ?? 0,
      matchScore: bestMatch?.score ?? 0,
      matchedSnippet: bestMatch?.chunkText?.slice(0, 200) ?? "",
    };
  });

  // 7) ترتيب حسب ATS score (الأعلى أولاً)
  const sorted = merged.sort((a, b) => b.atsScore - a.atsScore);

  return { intent: "search", results: sorted };
}