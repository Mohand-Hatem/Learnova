// import { Pinecone } from "@pinecone-database/pinecone";
// import { JsonOutputParser } from "@langchain/core/output_parsers";
// import Env from "../config/handelEnv.js";

// // ══════════════════════════════════════════════════════════════════════════════
// // PINECONE
// // ══════════════════════════════════════════════════════════════════════════════

// const pinecone = new Pinecone({
//   apiKey: Env.PINECONE_API_KEY,
// });
// export const pineconeIndex = pinecone.index(Env.PINECONE_INDEX_NAME);

// // ══════════════════════════════════════════════════════════════════════════════
// // BEDROCK GATEWAY HELPERS
// // ══════════════════════════════════════════════════════════════════════════════

// async function getEmbeddings(texts) {
//   try {
//     const response = await fetch(
//       "http://apiaccess.iti.net.eg/api/v1/student/embed",
//       {
//         method: "POST",
//         headers: {
//           Authorization: `Bearer ${Env.SBG_API_KEY}`,
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           model_id: "amazon.titan-embed-text-v2:0:8k",
//           texts,
//           input_type: "search_document",
//         }),
//       }
//     );

//     if (!response.ok) {
//       const errText = await response.text();
//       throw new Error(`Embed Gateway error: ${response.status} ${errText}`);
//     }

//     const data = await response.json();
//     console.log("EMBED RAW RESPONSE:", JSON.stringify(data, null, 2));
//     return data;
//   } catch (err) {
//     console.error("FETCH ERROR NAME:", err.name);
//     console.error("FETCH ERROR MESSAGE:", err.message);
//     console.error("FETCH ERROR CAUSE:", err.cause);
//     throw err;
//   }
// }

// // ══════════════════════════════════════════════════════════════════════════════
// // HELPERS
// // ══════════════════════════════════════════════════════════════════════════════

// function chunkText(text, chunkSize = 500, overlap = 100) {
//   if (!text || typeof text !== "string") return [];

//   const words = text.trim().split(/\s+/).filter(Boolean);
//   const chunks = [];
//   let i = 0;

//   while (i < words.length) {
//     const chunk = words.slice(i, i + chunkSize).join(" ");
//     if (chunk) chunks.push(chunk);
//     i += chunkSize - overlap;
//   }

//   return chunks;
// }

// export async function embedAndStore(cvId, text) {
//   const chunks = chunkText(text);

//   if (!chunks.length) {
//     console.warn(`[embedAndStore] No chunks generated for cvId: ${cvId}`);
//     return { vectorIds: [], embeddingTokens: 0 };
//   }

//   const validChunks = chunks.filter((c) => c.trim().length > 0);
//   console.log("validChunks length:", validChunks.length);

//   if (!validChunks.length) {
//     console.warn(`[embedAndStore] All chunks were empty for cvId: ${cvId}`);
//     return { vectorIds: [], embeddingTokens: 0 };
//   }

//   let totalEmbeddingTokens = 0;
//   const allVectors = [];

//   const EMBED_BATCH_SIZE = 100;
//   for (let i = 0; i < validChunks.length; i += EMBED_BATCH_SIZE) {
//     const batch = validChunks.slice(i, i + EMBED_BATCH_SIZE);
//     const embData = await getEmbeddings(batch);

//     totalEmbeddingTokens += embData.usage?.total_tokens ?? 0;
//     embData.embeddings.forEach((vec) => allVectors.push(vec));
//   }

//   console.log("vectors length:", allVectors.length, "| embedding tokens:", totalEmbeddingTokens);

//   const records = validChunks.map((chunk, index) => ({
//     id: `${cvId}_chunk_${index}`,
//     values: allVectors[index],
//     metadata: {
//       cvId: cvId.toString(),
//       chunkIndex: index,
//       text: chunk,
//     },
//   }));

//   console.log("records length:", records.length);

//   const BATCH_SIZE = 100;
//   for (let i = 0; i < records.length; i += BATCH_SIZE) {
//     const batch = records.slice(i, i + BATCH_SIZE);
//     console.log(`upserting batch ${i} with ${batch.length} records`);
//     if (batch.length > 0) {
//       await pineconeIndex.upsert({ records: batch });
//     }
//   }

//   return { vectorIds: records.map((r) => r.id), embeddingTokens: totalEmbeddingTokens };
// }

// export async function queryCV(cvId) {
//   const query = "skills experience education projects certifications";

//   const embData = await getEmbeddings([query]);
//   const vector = embData.embeddings[0];

//   const result = await pineconeIndex.query({
//     vector,
//     topK: 10,
//     includeMetadata: true,
//     filter: {
//       cvId: { $eq: cvId.toString() },
//     },
//   });

//   return result.matches
//     .sort((a, b) => a.metadata.chunkIndex - b.metadata.chunkIndex)
//     .map((item) => item.metadata.text)
//     .join("\n\n");
// }

// // ══════════════════════════════════════════════════════════════════════════════
// // ATS AI
// // ══════════════════════════════════════════════════════════════════════════════

// const ATS_SYSTEM_PROMPT = `
// You are an advanced ATS (routelicant Tracking System) analyzer and AI career coach.

// Return ONLY valid JSON.

// {
//   "atsScore": 0,

//   "scoreBreakdown": {
//     "keywordMatch": 0,
//     "formattingClarity": 0,
//     "skillsRelevance": 0,
//     "experienceDepth": 0,
//     "educationCertifications": 0
//   },

//   "parsedData": {
//     "skills": {
//       "technical": [],
//       "soft": [],
//       "missingRecommended": []
//     },

//     "certifications": [],

//     "experience": [
//       {
//         "role": "",
//         "company": "",
//         "duration": "",
//         "description": ""
//       }
//     ],

//     "education": [
//       {
//         "degree": "",
//         "institution": "",
//         "year": ""
//       }
//     ],

//     "projects": [
//       {
//         "name": "",
//         "description": "",
//         "technologies": []
//       }
//     ]
//   },

//   "aiAnalysis": {
//     "summary": "",

//     "strengths": [
//       {
//         "title": "",
//         "detail": ""
//       }
//     ],

//     "weaknesses": [
//       {
//         "title": "",
//         "detail": ""
//       }
//     ],

//     "suggestions": [
//       {
//         "title": "",
//         "detail": ""
//       }
//     ]
//   }
// }
// `;

// export async function analyzeCV(text) {
//   const startTime = Date.now();
//   try {
//     const response = await fetch(
//       "http://apiaccess.iti.net.eg/api/v1/student/chat",
//       {
//         method: "POST",
//         headers: {
//           Authorization: `Bearer ${Env.SBG_API_KEY}`,
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           model_id: "openai.gpt-oss-120b-1:0",
//           messages: [
//             { role: "system", text: ATS_SYSTEM_PROMPT },
//             { role: "user", text: `Resume Text:\n\n${text}` },
//           ],
//           max_tokens: 3000,
//         }),
//       }
//     );

//     if (!response.ok) {
//       const errText = await response.text();
//       throw new Error(`Bedrock Gateway error: ${response.status} ${errText}`);
//     }

//     const data = await response.json();
//     const responseTimeMs = Date.now() - startTime;

//     const usage = data.usage ?? {};
//     const promptTokens = usage.input_tokens ?? 0;
//     const completionTokens = usage.output_tokens ?? 0;
//     const totalTokens = usage.total_tokens ?? 0;

//     const parser = new JsonOutputParser();
//     const report = await parser.parse(data.output_text ?? "");

//     return { report, promptTokens, completionTokens, totalTokens, responseTimeMs };
//   } catch (err) {
//     console.error("ANALYZE CV FETCH ERROR NAME:", err.name);
//     console.error("ANALYZE CV FETCH ERROR MESSAGE:", err.message);
//     console.error("ANALYZE CV FETCH ERROR CAUSE:", err.cause);
//     throw err;
//   }
// }

























































import { Index } from "@upstash/vector";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import Env from "../config/handelEnv.js";

// ══════════════════════════════════════════════════════════════════════════════
// UPSTASH VECTOR
// ══════════════════════════════════════════════════════════════════════════════
// titan-embed-text-v2:0:8k بيطلع 1024 dim افتراضياً. لازم الـ Upstash index
// يكون متعمل بـ Dimensions = 1024 و Metric = Cosine من الـ Console.

export const vectorIndex = new Index({
  url: Env.UPSTASH_VECTOR_REST_URL,
  token: Env.UPSTASH_VECTOR_REST_TOKEN,
});

const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";
const EMBED_MODEL = "baai/bge-m3";              // embedding — 1024 dim
const CHAT_MODEL = "openai/gpt-oss-20b";        // chat / تحليل الـ CV — كله على NVIDIA

// ══════════════════════════════════════════════════════════════════════════════
// NVIDIA HELPERS
// ══════════════════════════════════════════════════════════════════════════════

async function getEmbeddings(texts, inputType = "passage") {
  try {
    const response = await fetch(`${NVIDIA_BASE_URL}/embeddings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Env.NVIDIA_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: EMBED_MODEL,
        input: texts,
        input_type: inputType, // "passage" للتخزين، "query" للبحث
        encoding_format: "float",
        truncate: "END",
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`NVIDIA Embed error: ${response.status} ${errText}`);
    }

    const data = await response.json();
    console.log("EMBED RAW RESPONSE:", JSON.stringify(data, null, 2));

    return {
      embeddings: data.data.map((d) => d.embedding),
      usage: data.usage,
    };
  } catch (err) {
    console.error("FETCH ERROR NAME:", err.name);
    console.error("FETCH ERROR MESSAGE:", err.message);
    console.error("FETCH ERROR CAUSE:", err.cause);
    throw err;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function chunkText(text, chunkSize = 500, overlap = 100) {
  if (!text || typeof text !== "string") return [];

  const words = text.trim().split(/\s+/).filter(Boolean);
  const chunks = [];
  let i = 0;

  while (i < words.length) {
    const chunk = words.slice(i, i + chunkSize).join(" ");
    if (chunk) chunks.push(chunk);
    i += chunkSize - overlap;
  }

  return chunks;
}

export async function embedAndStore(cvId, text) {
  const chunks = chunkText(text);

  if (!chunks.length) {
    console.warn(`[embedAndStore] No chunks generated for cvId: ${cvId}`);
    return { vectorIds: [], embeddingTokens: 0 };
  }

  const validChunks = chunks.filter((c) => c.trim().length > 0);
  console.log("validChunks length:", validChunks.length);

  if (!validChunks.length) {
    console.warn(`[embedAndStore] All chunks were empty for cvId: ${cvId}`);
    return { vectorIds: [], embeddingTokens: 0 };
  }

  let totalEmbeddingTokens = 0;
  const allVectors = [];

  const EMBED_BATCH_SIZE = 100;
  for (let i = 0; i < validChunks.length; i += EMBED_BATCH_SIZE) {
    const batch = validChunks.slice(i, i + EMBED_BATCH_SIZE);
    const embData = await getEmbeddings(batch, "passage");

    totalEmbeddingTokens += embData.usage?.total_tokens ?? 0;
    embData.embeddings.forEach((vec) => allVectors.push(vec));
  }

  console.log("vectors length:", allVectors.length, "| embedding tokens:", totalEmbeddingTokens);

  const records = validChunks.map((chunk, index) => ({
    id: `${cvId}_chunk_${index}`,
    vector: allVectors[index], // Upstash بيستخدم "vector" مش "values"
    metadata: {
      cvId: cvId.toString(),
      chunkIndex: index,
      text: chunk,
    },
  }));

  console.log("records length:", records.length);

  const BATCH_SIZE = 100;
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    console.log(`upserting batch ${i} with ${batch.length} records`);
    if (batch.length > 0) {
      // Upstash upsert format: [{ id, vector, metadata }]
      await vectorIndex.upsert(batch);
    }
  }

  return { vectorIds: records.map((r) => r.id), embeddingTokens: totalEmbeddingTokens };
}

export async function queryCV(cvId) {
  const query = "skills experience education projects certifications";

  const embData = await getEmbeddings([query], "query");
  const vector = embData.embeddings[0];

  // Upstash بيستخدم filter كـ SQL-like string مش object زي Pinecone
  const result = await vectorIndex.query({
    vector,
    topK: 10,
    includeMetadata: true,
    filter: `cvId = '${cvId.toString()}'`,
  });

  console.log("[queryCV] matches found:", result.length);

  const context = result
    .sort((a, b) => a.metadata.chunkIndex - b.metadata.chunkIndex)
    .map((item) => item.metadata.text)
    .join("\n\n");

  console.log("[queryCV] context length (chars):", context.length);
  console.log("[queryCV] context preview:", context.slice(0, 200));

  return context;
}

// ══════════════════════════════════════════════════════════════════════════════
// ATS AI
// ══════════════════════════════════════════════════════════════════════════════

const ATS_SYSTEM_PROMPT = `
You are an advanced ATS (Applicant Tracking System) analyzer and AI career coach.

#SCORING RULES (very important):
- All score fields ("atsScore" and everything inside "scoreBreakdown") MUST be
  INTEGERS between 0 and 100 (inclusive) — e.g. 54, 80, 100.
- Do NOT use decimals like 0.54 or percentages with a "%" sign.
- "atsScore" should reflect an overall weighted score out of 100 based on the
  breakdown fields below.
- Return ONLY valid JSON, no markdown, no code fences, no preamble.

#CRITICAL: The JSON structure below is a TEMPLATE showing field names and types
ONLY. You MUST replace every value with your actual analysis of the resume
text provided by the user. NEVER return the template as-is with empty
strings, empty arrays, or zero scores — that is treated as a failed response.
If the resume text seems short, still do your best to extract and infer
whatever information is available, and give non-zero scores based on it.

{
  "atsScore": 0,

  "scoreBreakdown": {
    "keywordMatch": 0,
    "formattingClarity": 0,
    "skillsRelevance": 0,
    "experienceDepth": 0,
    "educationCertifications": 0
  },

  "parsedData": {
    "skills": {
      "technical": [],
      "soft": [],
      "missingRecommended": []
    },

    "certifications": [
      {
        "name": "",
        "issuer": "",
        "date": ""
      }
    ],
    "experience": [
      {
        "role": "",
        "company": "",
        "duration": "",
        "description": ""
      }
    ],

    "education": [
      {
        "degree": "",
        "institution": "",
        "year": ""
      }
    ],

    "projects": [
      {
        "name": "",
        "description": "",
        "technologies": []
      }
    ]
  },

  "aiAnalysis": {
    "summary": "",

    "strengths": [
      {
        "title": "",
        "detail": ""
      }
    ],

    "weaknesses": [
      {
        "title": "",
        "detail": ""
      }
    ],

    "suggestions": [
      {
        "title": "",
        "detail": ""
      }
    ]
  }
}
`;

// ══════════════════════════════════════════════════════════════════════════════
// DYNAMIC MAX_TOKENS
// ══════════════════════════════════════════════════════════════════════════════
// بدل ما نثبّت max_tokens على رقم واحد، بنحسبه على حسب رصيد اليوزر المتبقي
// عشان: (1) منستهلكش رصيده كله في تحليل واحد، (2) نضمن رد كامل مش مقطوع.

const IDEAL_MAX_TOKENS = 4000;  // أفضل قيمة عشان الرد يخرج كامل من غير قطع
const MIN_MAX_TOKENS = 800;     // أقل قيمة تقدر تدي رد JSON مفيد
const SAFETY_BUFFER = 200;      // هامش أمان عشان الحسبة تكون تقريبية مش دقيقة 100%

// تقدير تقريبي لعدد التوكنز (rule of thumb: ~4 حروف = توكن واحد في الإنجليزي)
function estimateTokens(str) {
  return Math.ceil((str?.length ?? 0) / 4);
}

/**
 * بيحسب max_tokens المناسب بناءً على رصيد اليوزر المتبقي.
 * لو الرصيد قليل جداً، بيرجع null يعني "منعش نكمل، الرصيد مش كافي".
 */
function calculateDynamicMaxTokens(resumeText, remainingQuota) {
  // لو مفيش remainingQuota (يعني الفنكشن اتنادت من غير الباراميتر ده)،
  // استخدم القيمة المثالية مباشرة من غير حسابات
  if (remainingQuota == null) return IDEAL_MAX_TOKENS;

  const estimatedPromptTokens =
    estimateTokens(ATS_SYSTEM_PROMPT) + estimateTokens(resumeText);

  const availableForCompletion =
    remainingQuota - estimatedPromptTokens - SAFETY_BUFFER;

  if (availableForCompletion < MIN_MAX_TOKENS) {
    return null; // الرصيد مش كافي حتى لأقل رد مفيد
  }

  return Math.min(IDEAL_MAX_TOKENS, availableForCompletion);
}

/**
 * @param {string} text - الـ context المستخرج من الـ CV
 * @param {number|null} remainingQuota - رصيد اليوزر المتبقي (user.maxToken - user.tokenUsage)
 *   لو مبعتتش الباراميتر ده، هيستخدم IDEAL_MAX_TOKENS بشكل ثابت.
 */
export async function analyzeCV(text, remainingQuota = null) {
  const startTime = Date.now();
  const MAX_RETRIES = 3;
  const TIMEOUT_MS = 90_000;

  const dynamicMaxTokens = calculateDynamicMaxTokens(text, remainingQuota);

  if (dynamicMaxTokens === null) {
    const err = new Error(
      "INSUFFICIENT_QUOTA: رصيد التوكنز المتبقي مش كافي لعمل تحليل كامل. رجاءً upgrade الـ plan."
    );
    err.code = "INSUFFICIENT_QUOTA";
    throw err;
  }

  console.log(
    `[analyzeCV] using max_tokens: ${dynamicMaxTokens}` +
      (remainingQuota != null ? ` (remainingQuota: ${remainingQuota})` : " (fixed, no quota passed)")
  );

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Env.NVIDIA_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: CHAT_MODEL,
          messages: [
            { role: "system", content: ATS_SYSTEM_PROMPT },
            { role: "user", content: `Resume Text:\n\n${text}` },
          ],
          max_tokens: dynamicMaxTokens,
          temperature: 0.3,
          response_format: { type: "json_object" },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text();
        const isRetryable = [429, 502, 503, 504].includes(response.status);
        if (isRetryable && attempt < MAX_RETRIES) {
          console.warn(
            `[analyzeCV] attempt ${attempt} failed with ${response.status}, retrying...`
          );
          await new Promise((r) => setTimeout(r, 2000 * attempt)); // backoff
          continue;
        }
        throw new Error(`NVIDIA Chat error: ${response.status} ${errText}`);
      }

      const data = await response.json();
      const responseTimeMs = Date.now() - startTime;

      const usage = data.usage ?? {};
      const promptTokens = usage.prompt_tokens ?? 0;
      const completionTokens = usage.completion_tokens ?? 0;
      const totalTokens = usage.total_tokens ?? 0;

      const finishReason = data.choices?.[0]?.finish_reason;
      console.log("[analyzeCV] finish_reason:", finishReason);
      console.log("[analyzeCV] completionTokens:", completionTokens, "/ max_tokens:", dynamicMaxTokens);
      console.log("[analyzeCV] resume text length (chars):", text.length);

      if (finishReason === "length") {
        console.warn(
          "[analyzeCV] ⚠️ الرد اتقطع لأنه وصل لحد max_tokens الديناميكي! يمكن رصيد اليوزر قليل."
        );
      }

      let rawText = data.choices?.[0]?.message?.content ?? "";


      rawText = rawText.replace(/```json|```/g, "").trim();

      const parser = new JsonOutputParser();
      const report = await parser.parse(rawText);

      const normalizeScore = (val) => {
        if (typeof val !== "number") return 0;
        const scaled = val > 0 && val <= 1 ? val * 100 : val;
        return Math.max(0, Math.min(100, Math.round(scaled)));
      };

      if (report.atsScore != null) {
        report.atsScore = normalizeScore(report.atsScore);
      }
      if (report.scoreBreakdown) {
        for (const key of Object.keys(report.scoreBreakdown)) {
          report.scoreBreakdown[key] = normalizeScore(report.scoreBreakdown[key]);
        }
      }

      // ✅ تحقق: هل الموديل رجّع الـ template فاضي بدل ما يملاه فعلاً؟
      // لو أيوه، ده مش رد ناجح — نعتبره فشل ونعيد المحاولة
      const isEmptyReport =
        report.atsScore === 0 &&
        Object.values(report.scoreBreakdown ?? {}).every((v) => v === 0) &&
        !report.aiAnalysis?.summary?.trim() &&
        (report.parsedData?.skills?.technical?.length ?? 0) === 0 &&
        (report.parsedData?.skills?.soft?.length ?? 0) === 0;

      if (isEmptyReport && attempt < MAX_RETRIES) {
        console.warn(
          `[analyzeCV] attempt ${attempt} رجّع template فاضي (الموديل ماحللش حاجة)، بنعيد المحاولة...`
        );
        await new Promise((r) => setTimeout(r, 1500 * attempt));
        continue;
      }

      if (isEmptyReport) {
        const err = new Error(
          "EMPTY_ANALYSIS: الموديل رجّع رد فاضي بعد كل المحاولات. جرب تاني أو راجع نص الـ CV."
        );
        err.code = "EMPTY_ANALYSIS";
        throw err;
      }

      return { report, promptTokens, completionTokens, totalTokens, responseTimeMs };
    } catch (err) {
      const isTimeout = err.name === "AbortError";
      console.error("ANALYZE CV FETCH ERROR NAME:", isTimeout ? "TimeoutError" : err.name);
      console.error("ANALYZE CV FETCH ERROR MESSAGE:", err.message);
      console.error("ANALYZE CV FETCH ERROR CAUSE:", err.cause);

      if (err.code === "EMPTY_ANALYSIS") throw err; 

      if (attempt < MAX_RETRIES) {
        console.warn(`[analyzeCV] attempt ${attempt} threw, retrying...`);
        await new Promise((r) => setTimeout(r, 2000 * attempt));
        continue;
      }
      throw err;
    }
  }
}














































































// import { extractText } from "unpdf";
// import { Pinecone } from "@pinecone-database/pinecone";
// import OpenAI from "openai";
// import { OpenAIEmbeddings } from "@langchain/openai";
// import { JsonOutputParser } from "@langchain/core/output_parsers";
// import Env from "../config/handelEnv.js";

// // used only for embedding token tracking — openai is already a dep of @langchain/openai
// const openaiClient = new OpenAI({ apiKey: Env.OPENAI_API_KEY });

// // ══════════════════════════════════════════════════════════════════════════════
// // PINECONE
// // ══════════════════════════════════════════════════════════════════════════════

// const pinecone = new Pinecone({
//   apiKey: Env.PINECONE_API_KEY,
// });
// export const pineconeIndex = pinecone.index(Env.PINECONE_INDEX_NAME);

// const embeddings = new OpenAIEmbeddings({
//   model: "text-embedding-3-small",
//   apiKey: Env.OPENAI_API_KEY,
// });

// // ══════════════════════════════════════════════════════════════════════════════
// // HELPERS
// // ══════════════════════════════════════════════════════════════════════════════

// function chunkText(text, chunkSize = 500, overlap = 100) {
//   if (!text || typeof text !== "string") return [];

//   const words = text.trim().split(/\s+/).filter(Boolean);
//   const chunks = [];
//   let i = 0;

//   while (i < words.length) {
//     const chunk = words.slice(i, i + chunkSize).join(" ");
//     if (chunk) chunks.push(chunk);
//     i += chunkSize - overlap;
//   }

//   return chunks;
// }

// export async function embedAndStore(cvId, text) {
//   const chunks = chunkText(text);

//   if (!chunks.length) {
//     console.warn(`[embedAndStore] No chunks generated for cvId: ${cvId}`);
//     return { vectorIds: [], embeddingTokens: 0 };
//   }

//   const validChunks = chunks.filter((c) => c.trim().length > 0);
//   console.log("validChunks length:", validChunks.length);

//   if (!validChunks.length) {
//     console.warn(`[embedAndStore] All chunks were empty for cvId: ${cvId}`);
//     return { vectorIds: [], embeddingTokens: 0 };
//   }
//   let totalEmbeddingTokens = 0;
//   const allVectors = [];

//   const EMBED_BATCH_SIZE = 100;
//   for (let i = 0; i < validChunks.length; i += EMBED_BATCH_SIZE) {
//     const batch = validChunks.slice(i, i + EMBED_BATCH_SIZE);
//     const embResponse = await openaiClient.embeddings.create({
//       model: "text-embedding-3-small",
//       input: batch,
//     });
//     totalEmbeddingTokens += embResponse.usage?.total_tokens ?? 0;
//     embResponse.data.forEach((item) => allVectors.push(item.embedding));
//   }

//   console.log("vectors length:", allVectors.length, "| embedding tokens:", totalEmbeddingTokens);

//   const records = validChunks.map((chunk, index) => ({
//     id: `${cvId}_chunk_${index}`,
//     values: allVectors[index],
//     metadata: {
//       cvId: cvId.toString(),
//       chunkIndex: index,
//       text: chunk,
//     },
//   }));

//   console.log("records length:", records.length);

//   const BATCH_SIZE = 100;
//   for (let i = 0; i < records.length; i += BATCH_SIZE) {
//     const batch = records.slice(i, i + BATCH_SIZE);
//     console.log(`upserting batch ${i} with ${batch.length} records`);
//     if (batch.length > 0) {
//       await pineconeIndex.upsert({ records: batch });
//     }
//   }

//   return { vectorIds: records.map((r) => r.id), embeddingTokens: totalEmbeddingTokens };
// }

// export async function queryCV(cvId) {
//   const query = "skills experience education projects certifications";

//   const vector = await embeddings.embedQuery(query);

//   const result = await pineconeIndex.query({
//     vector,
//     topK: 10,
//     includeMetadata: true,
//     filter: {
//       cvId: { $eq: cvId.toString() },
//     },
//   });

//   return result.matches
//     .sort((a, b) => a.metadata.chunkIndex - b.metadata.chunkIndex)
//     .map((item) => item.metadata.text)
//     .join("\n\n");
// }

// // ══════════════════════════════════════════════════════════════════════════════
// // ATS AI
// // ══════════════════════════════════════════════════════════════════════════════

// const ATS_SYSTEM_PROMPT = `
// You are an advanced ATS (routelicant Tracking System) analyzer and AI career coach.

// Return ONLY valid JSON.

// {
//   "atsScore": 0,

//   "scoreBreakdown": {
//     "keywordMatch": 0,
//     "formattingClarity": 0,
//     "skillsRelevance": 0,
//     "experienceDepth": 0,
//     "educationCertifications": 0
//   },

//   "parsedData": {
//     "skills": {
//       "technical": [],
//       "soft": [],
//       "missingRecommended": []
//     },

//     "certifications": [],

//     "experience": [
//       {
//         "role": "",
//         "company": "",
//         "duration": "",
//         "description": ""
//       }
//     ],

//     "education": [
//       {
//         "degree": "",
//         "institution": "",
//         "year": ""
//       }
//     ],

//     "projects": [
//       {
//         "name": "",
//         "description": "",
//         "technologies": []
//       }
//     ]
//   },

//   "aiAnalysis": {
//     "summary": "",

//     "strengths": [
//       {
//         "title": "",
//         "detail": ""
//       }
//     ],

//     "weaknesses": [
//       {
//         "title": "",
//         "detail": ""
//       }
//     ],

//     "suggestions": [
//       {
//         "title": "",
//         "detail": ""
//       }
//     ]
//   }
// }
// `;

// export async function analyzeCV(text) {
//   const startTime = Date.now();

//   const response = await fetch(
//     "https://apiaccess.iti.net.eg/api/v1/student/chat",
//     {
//       method: "POST",
//       headers: {
//         Authorization: `Bearer ${Env.SBG_API_KEY}`,
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({
//         model_id: "openai.gpt-oss-120b-1:0",
//         messages: [
//           { role: "system", text: ATS_SYSTEM_PROMPT },
//           { role: "user", text: `Resume Text:\n\n${text}` },
//         ],
//         max_tokens: 3000,
//       }),
//     }
//   );

//   if (!response.ok) {
//     const errText = await response.text();
//     throw new Error(`Bedrock Gateway error: ${response.status} ${errText}`);
//   }

//   const data = await response.json();
//   const responseTimeMs = Date.now() - startTime;

//   const usage = data.usage ?? {};
//   const promptTokens = usage.input_tokens ?? 0;
//   const completionTokens = usage.output_tokens ?? 0;
//   const totalTokens = usage.total_tokens ?? 0;

//   const parser = new JsonOutputParser();
//   const report = await parser.parse(data.output_text ?? "");

//   return { report, promptTokens, completionTokens, totalTokens, responseTimeMs };
// }















































// import { extractText } from "unpdf";
// import { Pinecone } from "@pinecone-database/pinecone";
// import OpenAI from "openai";
// import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
// import {
//   ChatPromptTemplate,
//   SystemMessagePromptTemplate,
//   HumanMessagePromptTemplate,
// } from "@langchain/core/prompts";
// import { JsonOutputParser } from "@langchain/core/output_parsers";
// import Env from "../config/handelEnv.js";

// // used only for embedding token tracking — openai is already a dep of @langchain/openai
// const openaiClient = new OpenAI({ apiKey: Env.EMBIDING_API_KEY });

// // ══════════════════════════════════════════════════════════════════════════════
// // PINECONE
// // ══════════════════════════════════════════════════════════════════════════════

// const pinecone = new Pinecone({
//   apiKey: Env.PINECONE_API_KEY,
// });

// export const pineconeIndex = pinecone.index(Env.PINECONE_INDEX_NAME);

// const embeddings = new OpenAIEmbeddings({
//   model: "text-embedding-3-small",
//   apiKey: Env.EMBIDING_API_KEY,
// });

// // ══════════════════════════════════════════════════════════════════════════════
// // HELPERS
// // ══════════════════════════════════════════════════════════════════════════════

// function chunkText(text, chunkSize = 500, overlap = 100) {
//   if (!text || typeof text !== "string") return [];

//   const words = text.trim().split(/\s+/).filter(Boolean);
//   const chunks = [];
//   let i = 0;

//   while (i < words.length) {
//     const chunk = words.slice(i, i + chunkSize).join(" ");
//     if (chunk) chunks.push(chunk);
//     i += chunkSize - overlap;
//   }

//   return chunks;
// }

// export async function embedAndStore(cvId, text) {
//   const chunks = chunkText(text);

//   if (!chunks.length) {
//     console.warn(`[embedAndStore] No chunks generated for cvId: ${cvId}`);
//     return { vectorIds: [], embeddingTokens: 0 };
//   }

//   const validChunks = chunks.filter((c) => c.trim().length > 0);
//   console.log("validChunks length:", validChunks.length);

//   if (!validChunks.length) {
//     console.warn(`[embedAndStore] All chunks were empty for cvId: ${cvId}`);
//     return { vectorIds: [], embeddingTokens: 0 };
//   }
//   let totalEmbeddingTokens = 0;
//   const allVectors = [];

//   const EMBED_BATCH_SIZE = 100;
//   for (let i = 0; i < validChunks.length; i += EMBED_BATCH_SIZE) {
//     const batch = validChunks.slice(i, i + EMBED_BATCH_SIZE);
//     const embResponse = await openaiClient.embeddings.create({
//       model: "text-embedding-3-small",
//       input: batch,
//     });
//     totalEmbeddingTokens += embResponse.usage?.total_tokens ?? 0;
//     embResponse.data.forEach((item) => allVectors.push(item.embedding));
//   }

//   console.log("vectors length:", allVectors.length, "| embedding tokens:", totalEmbeddingTokens);

//   const records = validChunks.map((chunk, index) => ({
//     id: `${cvId}_chunk_${index}`,
//     values: allVectors[index],
//     metadata: {
//       cvId: cvId.toString(),
//       chunkIndex: index,
//       text: chunk,
//     },
//   }));

//   console.log("records length:", records.length);

//   const BATCH_SIZE = 100;
//   for (let i = 0; i < records.length; i += BATCH_SIZE) {
//     const batch = records.slice(i, i + BATCH_SIZE);
//     console.log(`upserting batch ${i} with ${batch.length} records`);
//     if (batch.length > 0) {
//       await pineconeIndex.upsert({ records: batch });
//     }
//   }

//   return { vectorIds: records.map((r) => r.id), embeddingTokens: totalEmbeddingTokens };
// }

// export async function queryCV(cvId) {
//   const query = "skills experience education projects certifications";

//   const vector = await embeddings.embedQuery(query);

//   const result = await pineconeIndex.query({
//     vector,
//     topK: 10,
//     includeMetadata: true,
//     filter: {
//       cvId: { $eq: cvId.toString() },
//     },
//   });

//   return result.matches
//     .sort((a, b) => a.metadata.chunkIndex - b.metadata.chunkIndex)
//     .map((item) => item.metadata.text)
//     .join("\n\n");
// }

// // ══════════════════════════════════════════════════════════════════════════════
// // ATS AI
// // ══════════════════════════════════════════════════════════════════════════════

// const ATS_SYSTEM_PROMPT = `
// You are an advanced ATS (routelicant Tracking System) analyzer and AI career coach.

// Return ONLY valid JSON.

// {
//   "atsScore": 0,

//   "scoreBreakdown": {
//     "keywordMatch": 0,
//     "formattingClarity": 0,
//     "skillsRelevance": 0,
//     "experienceDepth": 0,
//     "educationCertifications": 0
//   },

//   "parsedData": {
//     "skills": {
//       "technical": [],
//       "soft": [],
//       "missingRecommended": []
//     },

//     "certifications": [],

//     "experience": [
//       {
//         "role": "",
//         "company": "",
//         "duration": "",
//         "description": ""
//       }
//     ],

//     "education": [
//       {
//         "degree": "",
//         "institution": "",
//         "year": ""
//       }
//     ],

//     "projects": [
//       {
//         "name": "",
//         "description": "",
//         "technologies": []
//       }
//     ]
//   },

//   "aiAnalysis": {
//     "summary": "",

//     "strengths": [
//       {
//         "title": "",
//         "detail": ""
//       }
//     ],

//     "weaknesses": [
//       {
//         "title": "",
//         "detail": ""
//       }
//     ],

//     "suggestions": [
//       {
//         "title": "",
//         "detail": ""
//       }
//     ]
//   }
// }
// `;

// export async function analyzeCV(text) {
//   const model = new ChatOpenAI({
//     model: "openai/gpt-5.5",
//     apiKey: Env.GPT_API_KEY,
//     temperature: 0.2,
//   });

//   const prompt = ChatPromptTemplate.fromMessages([
//     SystemMessagePromptTemplate.fromTemplate(ATS_SYSTEM_PROMPT, {
//       templateFormat: "mustache",
//     }),
//     HumanMessagePromptTemplate.fromTemplate(`Resume Text:\n\n{resume_text}`),
//   ]);

//   const parser = new JsonOutputParser();

//   // invoke prompt → get formatted messages, then invoke model separately
//   // so we can read usage_metadata from the AIMessage before parsing
//   const startTime = Date.now();
//   const promptValue = await prompt.invoke({ resume_text: text });
//   const aiMessage = await model.invoke(promptValue);
//   const responseTimeMs = Date.now() - startTime;

//   // LangChain populates usage_metadata on AIMessage automatically
//   const usage = aiMessage.usage_metadata ?? {};
//   const promptTokens = usage.input_tokens ?? 0;
//   const completionTokens = usage.output_tokens ?? 0;
//   const totalTokens = usage.total_tokens ?? 0;

//   // Parse the JSON content from the message
//   const report = await parser.invoke(aiMessage);

//   return { report, promptTokens, completionTokens, totalTokens, responseTimeMs };
// }
