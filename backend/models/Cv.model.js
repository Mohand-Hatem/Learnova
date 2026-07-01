import mongoose from "mongoose";

const cvSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    originalFile: {
      url: {
        type: String,
        required: true,
      },

      publicId: {
        type: String,
        required: true,
      },

      fileType: {
        type: String,
        enum: ["pdf", "doc", "docx"],
        required: true,
      },

      fileName: {
        type: String,
        trim: true,
      },

      fileSize: {
        type: Number,
      },
    },

    extractedText: {
      type: String,
      default: "",
    },

    parsedData: {
      skills: {
        technical: [{ type: String, trim: true }],

        soft: [{ type: String, trim: true }],

        missingRecommended: [{ type: String, trim: true }],
      },
      certifications: [
        {
          name: {
            type: String,
            trim: true,
          },

          issuer: {
            type: String,
            trim: true,
          },

          date: {
            type: String,
            trim: true,
          },
        },
      ],

      experience: [
        {
          role: {
            type: String,
            trim: true,
          },

          company: {
            type: String,
            trim: true,
          },

          duration: {
            type: String,
            trim: true,
          },

          description: {
            type: String,
            trim: true,
          },
        },
      ],

      education: [
        {
          degree: {
            type: String,
            trim: true,
          },

          institution: {
            type: String,
            trim: true,
          },

          year: {
            type: String,
            trim: true,
          },
        },
      ],

      projects: [
        {
          name: {
            type: String,
            trim: true,
          },

          description: {
            type: String,
            trim: true,
          },

          technologies: [{ type: String, trim: true }],
        },
      ],
    },

    atsScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    scoreBreakdown: {
      keywordMatch: {
        type: Number,
        default: 0,
      },

      formattingClarity: {
        type: Number,
        default: 0,
      },

      skillsRelevance: {
        type: Number,
        default: 0,
      },

      experienceDepth: {
        type: Number,
        default: 0,
      },

      educationCertifications: {
        type: Number,
        default: 0,
      },
    },

    aiAnalysis: {
      summary: {
        type: String,
        default: "",
      },

      strengths: [
        {
          title: {
            type: String,
            trim: true,
          },

          detail: {
            type: String,
            trim: true,
          },
        },
      ],

      weaknesses: [
        {
          title: {
            type: String,
            trim: true,
          },

          detail: {
            type: String,
            trim: true,
          },
        },
      ],

      suggestions: [
        {
          title: {
            type: String,
            trim: true,
          },

          detail: {
            type: String,
            trim: true,
          },
        },
      ],
    },

    aiUsage: {
      embeddingTokens: { type: Number, default: 0 },
      promptTokens: { type: Number, default: 0 },
      completionTokens: { type: Number, default: 0 },
      totalTokens: { type: Number, default: 0 },
      responseTimeMs: { type: Number, default: 0 },
      analyzedAt: { type: Date, default: null },
    },

    pineconeVectorIds: [
      {
        type: String,
      },
    ],

    processingStatus: {
      type: String,
      enum: ["uploaded", "processing", "analyzed", "failed"],
      default: "uploaded",
    },

    errorMessage: {
      type: String,
      default: "",
    },
  },

  {
    timestamps: true,
  },
);

cvSchema.index({ userId: 1 });

const CV = mongoose.model("CV", cvSchema);

export default CV;