import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import cors from "cors";
import cookieParser from "cookie-parser";
import passport from "./config/passport.js";

import notFound from "./middleware/notFound.middleware.js";
import errorMiddleware from "./middleware/error.middleware.js";
import connectDB from "./config/db.js";
import Env from "./config/handelEnv.js";

import authRoutes from "./routes/auth.routes.js";

const app = express();

app.use(helmet());
app.use(morgan("dev"));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

app.use("/api/auth", authRoutes);

app.use(notFound);
app.use(errorMiddleware);

connectDB();

app.listen(Env.PORT || 5000, () => {
  console.log(`Server running on port ${Env.PORT || 5000}`);
});

export default app;