import mongoose from "mongoose";
import Env from "../config/handelEnv.js";

const connectDB = async () => {
  try {
    await mongoose.connect(Env.MONGO_URI);
    console.log("MongoDB connected");
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
};

export default connectDB;
