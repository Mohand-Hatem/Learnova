import { v2 as cloudinary } from "cloudinary";
import Env from "./handelEnv.js";

cloudinary.config({
  cloud_name: Env.CLOUD_NAME,   
  api_key: Env.CLOUD_KEY,      
  api_secret: Env.CLOUD_SECRET, 
});

export default cloudinary;