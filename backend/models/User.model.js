import mongoose from "mongoose";
import bcrypt from "bcryptjs";


const planConfig = {
  Free: 1000,
  Pro: 2000,
  Enterprise: 4000,
};

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
      minlength: 3,
      maxlength: 128,
    },

    maxToken: {
      type: Number,
      enum: [1000, 2000, 4000],
      default: 1000,
    },

    tokenUsage: {
      type: Number,
      default: 0,
    },

    plan: {
      type: String,
      enum: ["Free", "Pro", "Enterprise"],
      default: "Free",
    },

    role: {
      type: String,
      enum: ["student", "admin"],
      default: "student",
    },

    avatar: {
      type: String,
      default: "https://cdn-icons-png.flaticon.com/512/149/149071.png",
    },

    googleId: {
      type: String,
      default: null,
    },

   
    isBlocked: {
      type: Boolean,
      default: false,
    },

   
    resetPasswordToken: {
      type: String,
      default: null,
    },

    resetPasswordExpire: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);


userSchema.pre("save", async function () {

  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }

 
  if (this.isModified("plan")) {
    this.maxToken = planConfig[this.plan];
  }
});

userSchema.methods.matchPassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

const User = mongoose.model("User", userSchema);

export default User;