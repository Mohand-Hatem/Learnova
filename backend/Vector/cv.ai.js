import { extractText } from "unpdf";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import {
  ChatPromptTemplate,
  SystemMessagePromptTemplate,
  HumanMessagePromptTemplate,
} from "@langchain/core/prompts";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import Env from "../config/handelEnv.js";

// used only for embedding token tracking — openai is already a dep of @langchain/openai
const openaiClient = new OpenAI({ apiKey: Env.OPENAI_API_KEY });

// ══════════════════════════════════════════════════════════════════════════════
// PINECONE
// ══════════════════════════════════════════════════════════════════════════════

const pinecone = new Pinecone({
  apiKey: Env.PINECONE_API_KEY,
});

export const pineconeIndex = pinecone.index(Env.PINECONE_INDEX_NAME);

const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-small",
  apiKey: Env.OPENAI_API_KEY,
});

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

  // Use embeddings.client — the same OpenAI instance LangChain created internally
  let totalEmbeddingTokens = 0;
  const allVectors = [];

  const EMBED_BATCH_SIZE = 100;
  for (let i = 0; i < validChunks.length; i += EMBED_BATCH_SIZE) {
    const batch = validChunks.slice(i, i + EMBED_BATCH_SIZE);
    const embResponse = await openaiClient.embeddings.create({
      model: "text-embedding-3-small",
      input: batch,
    });
    totalEmbeddingTokens += embResponse.usage?.total_tokens ?? 0;
    embResponse.data.forEach((item) => allVectors.push(item.embedding));
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

  const vector = await embeddings.embedQuery(query);

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
  const model = new ChatOpenAI({
    model: "gpt-4o-mini",
    apiKey: Env.OPENAI_API_KEY,
    temperature: 0.2,
  });

  const prompt = ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate(ATS_SYSTEM_PROMPT, {
      templateFormat: "mustache",
    }),
    HumanMessagePromptTemplate.fromTemplate(`Resume Text:\n\n{resume_text}`),
  ]);

  const parser = new JsonOutputParser();

  // invoke prompt → get formatted messages, then invoke model separately
  // so we can read usage_metadata from the AIMessage before parsing
  const startTime = Date.now();
  const promptValue = await prompt.invoke({ resume_text: text });
  const aiMessage = await model.invoke(promptValue);
  const responseTimeMs = Date.now() - startTime;

  // LangChain populates usage_metadata on AIMessage automatically
  const usage = aiMessage.usage_metadata ?? {};
  const promptTokens = usage.input_tokens ?? 0;
  const completionTokens = usage.output_tokens ?? 0;
  const totalTokens = usage.total_tokens ?? 0;

  // Parse the JSON content from the message
  const report = await parser.invoke(aiMessage);

  return { report, promptTokens, completionTokens, totalTokens, responseTimeMs };
}
