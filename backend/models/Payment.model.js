import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    orderId: {
      type: String,
      required: true,
      unique: true,
    },
    plan: {
      type: String,
      required: true,
      enum: ["Free", "Pro", "Enterprise"],
    },
    amount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["Pending", "Paid", "Failed"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;
