import mongoose from "mongoose";

const CONVERSATION_TTL_SECONDS = 60 * 60 * 24 * 3; // 3 days

const conversationSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    messages: [
      {
        role: { type: String, enum: ["user", "assistant"], required: true },
        content: { type: String, required: true, trim: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    lastQuery: { type: String, default: "" },
    lastResults: [
      {
        cvId: { type: mongoose.Schema.Types.ObjectId, ref: "CV" },
        name: {
          en: { type: String, default: "Unknown" },
          ar: { type: String, default: "غير معروف" },
        },
        email: { type: String, default: "" },
        topSkills: [{ type: String, trim: true }],
        atsScore: { type: Number, default: 0 },
        matchScore: { type: Number, default: 0 },
        matchedSnippet: { type: String, default: "" },
        // ✅ محتاجينهم مخزنين عشان follow-up filter على الخبرة يقدر يشتغل
        // على النتايج المخزنة من غير ما يعيد الـ CV lookup
        experience: [
          {
            role: { type: String, default: "" },
            company: { type: String, default: "" },
            duration: { type: String, default: "" },
            description: { type: String, default: "" },
          },
        ],
        education: [
          {
            degree: { type: String, default: "" },
            institution: { type: String, default: "" },
            year: { type: String, default: "" },
          },
        ],
        cvFileUrl: { type: String, default: null },
        cvFileName: { type: String, default: null },
        cvFileType: { type: String, default: null },
      },
    ],

    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + CONVERSATION_TTL_SECONDS * 1000),
    },
  },
  { timestamps: true },
);

conversationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Conversation = mongoose.model("Conversation", conversationSchema);

export default Conversation;
export { CONVERSATION_TTL_SECONDS };
