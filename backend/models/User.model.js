import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { PLANS } from "../config/helpers.config.js";

const PLAN_NAMES = Object.keys(PLANS);
const PLAN_TOKEN_LIMITS = Object.values(PLANS).map((plan) => plan.maxToken);

const userSchema = new mongoose.Schema(
  {
    name: {
      en: { type: String, required: true, trim: true },
      ar: { type: String, required: true, trim: true },
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^\S+@\S+\.\S+$/,
    },

    password: {
      type: String,
      required: true,
      minlength: 8,
      maxlength: 128,
    },

    maxToken: {
      type: Number,
      enum: PLAN_TOKEN_LIMITS,
      default: PLANS.Free.maxToken,
    },

    tokenUsage: {
      type: Number,
      default: 0,
    },

    aiCallsCount: {
      type: Number,
      default: 0,
    },

    plan: {
      type: String,
      enum: PLAN_NAMES,
      default: "Free",
    },

    role: {
      type: String,
      enum: ["company", "user", "admin"],
      default: "user",
    },

    avatar: {
      type: String,
      default: "https://cdn-icons-png.flaticon.com/512/149/149071.png",
    },

    googleId: {
      type: String,
      default: null,
    },
    lastDashboardLoginAt: {
      type: Date,
      default: null,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    resetOtp: {
      type: String,
      default: null,
      select: false,
    },
    resetOtpExpires: {
      type: Date,
      default: null,
      select: false,
    },
  },
  { timestamps: true },
);

userSchema.pre("save", async function () {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }

  if (this.role === "admin") {
    this.plan = PLANS.Unlimited.name;
    this.maxToken = PLANS.Unlimited.maxToken;
    return;
  }

  if (this.isModified("plan")) {
    this.maxToken = PLANS[this.plan].maxToken;
  }
});

userSchema.methods.matchPassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

const User = mongoose.model("User", userSchema);

export default User;
