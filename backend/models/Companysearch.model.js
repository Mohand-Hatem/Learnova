import mongoose from "mongoose";

const companySearchSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", 
      required: true,
    },

    query: {
      type: String,
      required: true,
      trim: true,
    },

    results: [
      {
        cvId: { type: mongoose.Schema.Types.ObjectId, ref: "CV" },
        name: { type: String, trim: true },
        topSkills: [{ type: String, trim: true }],
        atsScore: { type: Number, default: 0 },
        matchScore: { type: Number, default: 0 },
        cvFileUrl: { type: String, default: null },
      },
    ],

    resultsCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true } // createdAt = وقت البحث بالظبط
);

companySearchSchema.index({ company: 1, createdAt: -1 });

const CompanySearch = mongoose.model("CompanySearch", companySearchSchema);

export default CompanySearch;