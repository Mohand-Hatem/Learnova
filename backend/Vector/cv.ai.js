import { Pinecone } from "@pinecone-database/pinecone";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import Env from "../config/handelEnv.js";

// ══════════════════════════════════════════════════════════════════════════════
// PINECONE
// ══════════════════════════════════════════════════════════════════════════════

const pinecone = new Pinecone({
  apiKey: Env.PINECONE_API_KEY,
});
export const pineconeIndex = pinecone.index(Env.PINECONE_INDEX_NAME);

// ══════════════════════════════════════════════════════════════════════════════
// BEDROCK GATEWAY HELPERS
// ══════════════════════════════════════════════════════════════════════════════

async function getEmbeddings(texts) {
  try {
    const response = await fetch(
      "https://apiaccess.iti.net.eg/api/v1/student/embed",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Env.SBG_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model_id: "amazon.titan-embed-text-v2:0:8k",
          texts,
          input_type: "search_document",
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Embed Gateway error: ${response.status} ${errText}`);
    }

    const data = await response.json();
    console.log("EMBED RAW RESPONSE:", JSON.stringify(data, null, 2));
    return data;
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
    const embData = await getEmbeddings(batch);

    totalEmbeddingTokens += embData.usage?.total_tokens ?? 0;
    embData.embeddings.forEach((vec) => allVectors.push(vec));
  }

  console.log("vectors length:", allVectors.length, "| embedding tokens:", totalEmbeddingTokens);

  const records = validChunks.map((chunk, index) => ({
    id: `${cvId}_chunk_${index}`,
    values: allVectors[index],
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
      await pineconeIndex.upsert({ records: batch });
    }
  }

  return { vectorIds: records.map((r) => r.id), embeddingTokens: totalEmbeddingTokens };
}

export async function queryCV(cvId) {
  const query = "skills experience education projects certifications";

  const embData = await getEmbeddings([query]);
  const vector = embData.embeddings[0];

  const result = await pineconeIndex.query({
    vector,
    topK: 10,
    includeMetadata: true,
    filter: {
      cvId: { $eq: cvId.toString() },
    },
  });

  return result.matches
    .sort((a, b) => a.metadata.chunkIndex - b.metadata.chunkIndex)
    .map((item) => item.metadata.text)
    .join("\n\n");
}

// ══════════════════════════════════════════════════════════════════════════════
// ATS AI
// ══════════════════════════════════════════════════════════════════════════════

const ATS_SYSTEM_PROMPT = `
You are an advanced ATS (routelicant Tracking System) analyzer and AI career coach.

Return ONLY valid JSON.

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

    "certifications": [],

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

export async function analyzeCV(text) {
  const startTime = Date.now();
  try {
    const response = await fetch(
      "https://apiaccess.iti.net.eg/api/v1/student/chat",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Env.SBG_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model_id: "openai.gpt-oss-120b-1:0",
          messages: [
            { role: "system", text: ATS_SYSTEM_PROMPT },
            { role: "user", text: `Resume Text:\n\n${text}` },
          ],
          max_tokens: 3000,
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Bedrock Gateway error: ${response.status} ${errText}`);
    }

    const data = await response.json();
    const responseTimeMs = Date.now() - startTime;

    const usage = data.usage ?? {};
    const promptTokens = usage.input_tokens ?? 0;
    const completionTokens = usage.output_tokens ?? 0;
    const totalTokens = usage.total_tokens ?? 0;

    const parser = new JsonOutputParser();
    const report = await parser.parse(data.output_text ?? "");

    return { report, promptTokens, completionTokens, totalTokens, responseTimeMs };
  } catch (err) {
    console.error("ANALYZE CV FETCH ERROR NAME:", err.name);
    console.error("ANALYZE CV FETCH ERROR MESSAGE:", err.message);
    console.error("ANALYZE CV FETCH ERROR CAUSE:", err.cause);
    throw err;
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
//   const model = new ChatOpenAI({
//     model: "openai.gpt-oss-120b-1:0",
//     apiKey: Env.OPENAI_API_KEY,
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
