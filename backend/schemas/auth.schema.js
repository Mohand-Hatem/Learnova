import { z } from "zod";

export const registerSchema = z.object({
  name: z.object({
    en: z
      .string()
      .trim()
      .min(2, "English name must be at least 2 characters")
      .max(50, "English name must be at most 50 characters"),
    ar: z
      .string()
      .trim()
      .min(2, "Arabic name must be at least 2 characters")
      .max(50, "Arabic name must be at most 50 characters"),
  }),

  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please provide a valid email address"),

  password: z
    .string()
    .min(3, "Password must be at least 3 characters")
    .max(15, "Password must be at most 15 characters"),

  role: z.enum(["user", "company", "admin"]).default("user"),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please provide a valid email address"),
  password: z.string().min(1, "Password is required"),
});
