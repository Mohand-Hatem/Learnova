import { z } from "zod";

export const updateRoleSchema = z.object({
  role: z.enum(["user", "company", "admin"], {
    errorMap: () => ({ message: 'Role must be "user", "company", or "admin"' }),
  }),
});

export const updatePlanSchema = z.object({
  plan: z.enum(["Free", "Pro", "Enterprise"], {
    errorMap: () => ({ message: 'Plan must be "Free", "Pro", or "Enterprise"' }),
  }),
});
