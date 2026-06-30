import mongoose from "mongoose";

const adminActionLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    targetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    targetName: {
      type: String,
      default: "",
      trim: true,
    },
    targetRole: {
      type: String,
      default: "",
      trim: true,
    },
    details: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true },
);

const AdminActionLog = mongoose.model("AdminActionLog", adminActionLogSchema);

export default AdminActionLog;
