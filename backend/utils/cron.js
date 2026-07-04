import cron from "node-cron";
import User from "../models/User.model.js";

export async function runMonthlyTokenReset() {
  try {
    await User.updateMany(
      {},
      {
        $set: {
          tokenUsage: 0,
          aiCallsCount: 0,
        },
      },
    );
    console.log("Token usage and AI calls count reset successfully");
  } catch (error) {
    console.log(error);
  }
}

cron.schedule("0 0 1 * *", runMonthlyTokenReset);
