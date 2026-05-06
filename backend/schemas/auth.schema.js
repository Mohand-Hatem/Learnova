import Joi from "joi";

export const registerSchema = Joi.object({
  name: Joi.object({
    en: Joi.string().trim().min(2).max(50).required(),
    ar: Joi.string().trim().min(2).max(50).required(),
  }).required(),

  email: Joi.string().trim().lowercase().email().required(),

  password: Joi.string().min(3).max(15).required(),

  role: Joi.string().valid("student", "admin").default("student"),
});

export const loginSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required(),
  password: Joi.string().required(),
});

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().optional(),
});