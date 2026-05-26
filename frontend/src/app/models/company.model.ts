export type CompanyPlan = 'Free' | 'Pro' | 'Enterprise';
export type CompanyStatus = 'Active' | 'Banned';

export interface Company {
  id: string;
  name: string;
  email: string;
  website: string;
  location: string;
  plan: CompanyPlan;
  searches: number;
  tokensUsed: number;
  tokensLimit: number;
  lastActivity: string;
  status: CompanyStatus;
  recruiters: number;
  openRoles: number;
  hiresThisQuarter: number;
  renewalDate: string;
  searchActivity: number[];
  tokenConsumption: number[];
  mostSearchedRoles: { role: string; count: number }[];
  mostSearchedSkills: { skill: string; count: number }[];
}
