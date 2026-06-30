import CV from "../models/Cv.model.js";
import { MIME_TO_FILETYPE } from "../config/helpers.config.js";
import asyncHandler from "express-async-handler";
import cloudinary from "../config/cloudinary.js";

export const uploadCV = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "No file uploaded. Please attach a PDF, DOC, or DOCX file.",
    });
  }

  const fileType = MIME_TO_FILETYPE[req.file.mimetype] ?? null;
  if (!fileType) {
    return res.status(400).json({
      success: false,
      message: "Invalid file type. Allowed: PDF, DOC, DOCX.",
    });
  }

  const cv = await CV.create({
    userId: req.user._id,
    originalFile: {
      url: req.file.path,
      publicId: req.file.filename,
      fileType,
      fileName: req.file.originalname,
      fileSize: req.file.size,
    },
    processingStatus: "uploaded",
  });

  res.status(201).json({
    success: true,
    message: "CV uploaded successfully",
    data: {
      id: cv._id,
      url: cv.originalFile.url,
      fileType: cv.originalFile.fileType,
      fileName: cv.originalFile.fileName,
      fileSize: cv.originalFile.fileSize,
      status: cv.processingStatus,
      uploadedAt: cv.createdAt,
    },
  });
});

export const getMyCVs = asyncHandler(async (req, res, next) => {
  const cvs = await CV.find({ userId: req.user._id })
    .select("originalFile processingStatus atsScore createdAt")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: cvs.length,
    data: cvs,
  });
});

export const getCVById = asyncHandler(async (req, res, next) => {
  const cv = await CV.findOne({ _id: req.params.id, userId: req.user._id });

  if (!cv) {
    return res.status(404).json({
      success: false,
      message: "CV not found",
    });
  }

  res.status(200).json({
    success: true,
    data: cv,
  });
});

export const deleteCV = asyncHandler(async (req, res, next) => {
  const cv = await CV.findOneAndDelete({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!cv) {
    return res.status(404).json({
      success: false,
      message: "CV not found",
    });
  }

  res.status(200).json({
    success: true,
    message: "CV deleted successfully",
  });
});

export const updateCV = asyncHandler(async (req, res, next) => {
  const cv = await CV.findOne({ _id: req.params.id, userId: req.user._id });

  if (!cv) {
    return res.status(404).json({ success: false, message: "CV not found" });
  }

  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "No file uploaded. Please attach a PDF, DOC, or DOCX file.",
    });
  }

  const fileType = MIME_TO_FILETYPE[req.file.mimetype] ?? null;
  if (!fileType) {
    return res.status(400).json({
      success: false,
      message: "Invalid file type. Allowed: PDF, DOC, DOCX.",
    });
  }

  // Attempt to remove previous file from Cloudinary (ignore errors)
  try {
    if (cv.originalFile && cv.originalFile.publicId) {
      await cloudinary.uploader.destroy(cv.originalFile.publicId, {
        resource_type: "raw",
      });
    }
  } catch (err) {
    // Log but don't block update
    console.error(
      "Failed to delete old CV from Cloudinary:",
      err.message || err,
    );
  }

  cv.originalFile = {
    url: req.file.path,
    publicId: req.file.filename,
    fileType,
    fileName: req.file.originalname,
    fileSize: req.file.size,
  };
  cv.processingStatus = "uploaded";

  await cv.save();

  res.status(200).json({
    success: true,
    message: "CV updated successfully",
    data: {
      id: cv._id,
      url: cv.originalFile.url,
      fileType: cv.originalFile.fileType,
      fileName: cv.originalFile.fileName,
      fileSize: cv.originalFile.fileSize,
      status: cv.processingStatus,
      updatedAt: cv.updatedAt,
    },
  });
});

// import { PDFParse } from "pdf-parse";
// import { ChatOpenAI } from "@langchain/openai";

// import {
//   ChatPromptTemplate,
//   HumanMessagePromptTemplate,
//   SystemMessagePromptTemplate,
// } from "@langchain/core/prompts";
// import {
//   JsonOutputParser,
//   StringOutputParser,
// } from "@langchain/core/output_parsers";

// app.post("/", multerRes.single("file"), async (req, res) => {
//   console.log(req.file);
//   const pdfParsed = new PDFParse({ data: req.file.buffer });
//   const cvText = await pdfParsed.getText();
//   const ATS_SYSTEM_PROMPT = `
// You are an advanced ATS (Applicant Tracking System) analyzer and AI career coach.

// You will receive the raw extracted text of a candidate resume.

// Your task is to:
// 1. Analyze the resume deeply.
// 2. Extract structured information.
// 3. Evaluate ATS compatibility.
// 4. Return ONLY valid JSON.
// 5. Do NOT add markdown, comments, explanations, or extra text.

// Return ONLY this exact JSON structure:

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

// Scoring Rules:
// - atsScore must be between 0 and 100.
// - keywordMatch score: 0–25
// - formattingClarity score: 0–20
// - skillsRelevance score: 0–20
// - experienceDepth score: 0–20
// - educationCertifications score: 0–15

// Important Rules:
// - Always return valid JSON.
// - Never return null values.
// - Use empty arrays [] when data is missing.
// - Use empty strings "" when text is unavailable.
// - Infer likely skills when clearly implied in experience/projects.
// - Keep summary professional and concise (2–3 sentences).
// - Suggestions should be actionable and ATS-focused.
// `;

//   const model = new ChatOpenAI({
//     model: "gpt-4o-mini",
//     apiKey: process.env.OPENAI_API_KEY,
//     temperature: 0.2,
//   });

//   const atsPrompt = ChatPromptTemplate.fromMessages([
//     SystemMessagePromptTemplate.fromTemplate(ATS_SYSTEM_PROMPT, {
//       templateFormat: "mustache",
//     }),

//     HumanMessagePromptTemplate.fromTemplate(`
// Here is the resume text:

// {resume_text}
// `),
//   ]);

//   const outputParser = new JsonOutputParser();

//   const atsChain = atsPrompt.pipe(model).pipe(outputParser);

//   const report = await atsChain.invoke({ resume_text: cvText });

//   res.status(200).json({
//     success: true,
//     message: "ATS analysis completed successfully",
//     report,
//   });
// });

// // ─── 1. Define the ATS system prompt ────────────────────────────────────────

// // ─── 2. Build the prompt template ───────────────────────────────────────────
// const atsPrompt = ChatPromptTemplate.fromMessages([
//   ["system", ATS_SYSTEM_PROMPT],
//   ["human", "Here is the resume text to analyze:\n\n{resume_text}"],
// ]);

// // ─── 3. Initialize the model ─────────────────────────────────────────────────
// // Replace with ChatAnthropic / ChatGoogleGenerativeAI as needed

// // ─── 4. Build the chain ──────────────────────────────────────────────────────
// const outputParser = new StringOutputParser();

// const atsChain = atsPrompt.pipe(model).pipe(outputParser);

// // ─── 5. Main analyzer function ───────────────────────────────────────────────
// /**
//  * Analyzes resume text and returns structured ATS report.
//  * @param {string} resumeText - Raw text extracted from PDF parser
//  * @returns {Promise<Object>} - Parsed ATS report object
//  */
// export async function analyzeResume(resumeText) {
//   if (!resumeText || resumeText.trim().length < 50) {
//     throw new Error("Resume text is too short or empty.");
//   }

//   const rawOutput = await atsChain.invoke({ resume_text: resumeText });

//   // Strip markdown fences if model wraps output anyway
//   const cleaned = rawOutput.replace(/```json|```/gi, "").trim();

//   const report = JSON.parse(cleaned);
//   return report;
// }

// // ─── 6. Optional: pretty-print helper ───────────────────────────────────────
// export function printReport(report) {
//   console.log("\n═══════════════════════════════════════════");
//   console.log(`  ATS SCORE: ${report.ats_score}/100`);
//   console.log("═══════════════════════════════════════════");

//   console.log("\n📊 Score Breakdown:");
//   for (const [key, val] of Object.entries(report.score_breakdown)) {
//     console.log(`  ${key.replace(/_/g, " ")}: ${val}`);
//   }

//   console.log("\n✅ Strengths:");
//   report.strengths.forEach((s) => console.log(`  • ${s.title}: ${s.detail}`));

//   console.log("\n⚠️  Weaknesses:");
//   report.weaknesses.forEach((w) => console.log(`  • ${w.title}: ${w.detail}`));

//   console.log("\n🛠  Skills Found:");
//   console.log("  Technical:", report.skills.technical.join(", "));
//   console.log("  Soft:", report.skills.soft.join(", "));
//   console.log(
//     "  Missing/Recommended:",
//     report.skills.missing_recommended.join(", "),
//   );

//   console.log("\n📝 Summary:");
//   console.log(" ", report.summary);
// }
