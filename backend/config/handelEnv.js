import dotenv from "dotenv";

dotenv.config();
const Env = {
  PORT: process.env.PORT,
  NODE_ENV: process.env.NODE_ENV,
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  GOOGLE_ID: process.env.GOOGLE_ID,
  GOOGLE_SECRET: process.env.GOOGLE_SECRET,
  BACKEND_URL: process.env.BACKEND_URL,
  CLOUD_NAME: process.env.CLOUD_NAME,
  CLOUD_KEY: process.env.CLOUD_KEY,
  CLOUD_SECRET: process.env.CLOUD_SECRET,
  NODE_ENV: process.env.NODE_ENV,
  EMAIL: process.env.EMAIL,
  EMAIL_PASS: process.env.EMAIL_PASS,
  FRONTEND_URL: process.env.FRONTEND_URL,
  PAYMOB_API_KEY: process.env.PAYMOB_API_KEY,
  PAYMOB_INTEGRATION_ID: process.env.PAYMOB_INTEGRATION_ID,
  PAYMOB_IFRAME_ID: process.env.PAYMOB_IFRAME_ID,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  SBG_API_KEY: process.env.SBG_API_KEY,
  PINECONE_API_KEY: process.env.PINECONE_API_KEY,
  PINECONE_INDEX_NAME: process.env.PINECONE_INDEX_NAME,
  MAIN_SITE: process.env.MAIN_SITE,
};

export default Env;
