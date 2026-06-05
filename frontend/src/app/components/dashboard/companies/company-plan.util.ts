export const COMPANY_PLANS = ['Free', 'Pro', 'Enterprise'] as const;
export type CompanyPlan = (typeof COMPANY_PLANS)[number];
