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
      skills: [
        {
          type: String,
          trim: true,
        },
      ],

      experience: [
        {
          company: {
            type: String,
            trim: true,
          },

          role: {
            type: String,
            trim: true,
          },

          startDate: {
            type: Date,
          },

          endDate: {
            type: Date,
          },

          description: {
            type: String,
            trim: true,
          },
        },
      ],

      education: [
        {
          university: {
            type: String,
            trim: true,
          },

          degree: {
            type: String,
            trim: true,
          },

          field: {
            type: String,
            trim: true,
          },

          startDate: {
            type: Date,
          },

          endDate: {
            type: Date,
          },
        },
      ],

      projects: [
        {
          title: {
            type: String,
            trim: true,
          },

          description: {
            type: String,
            trim: true,
          },

          technologies: [
            {
              type: String,
              trim: true,
            },
          ],
        },
      ],

      certifications: [
        {
          type: String,
          trim: true,
        },
      ],
    },

    atsScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    aiAnalysis: {
      summary: {
        type: String,
        default: "",
      },
      strengths: [
        {
          type: String,
          trim: true,
        },
      ],
      weaknesses: [
        {
          type: String,
          trim: true,
        },
      ],

      suggestions: [
        {
          type: String,
          trim: true,
        },
      ],
    },
    pineconeVectorId: {
      type: String,
      default: null,
    },
    processingStatus: {
      type: String,
      enum: ["uploaded", "processing", "analyzed", "failed"],
      default: "uploaded",
    },
  },
  {
    timestamps: true,
  },
);

cvSchema.index({ userId: 1 });
const CV = mongoose.model("CV", cvSchema);

export default CV;
