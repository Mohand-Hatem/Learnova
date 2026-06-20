export type UserName = { en: string; ar: string } | string;


export interface SearchedRole {
  role: string;
  count: number;
}


export interface SearchedSkill {
  skill: string;
  count: number;
}


export interface CompanyItem {
  _id: string;
  name: UserName;
  email: string;
  role: string;
  plan: string;
  maxToken: number;
  tokenUsage: number;
  isBlocked?: boolean;
  createdAt: string;
  searches?: number | null;
  aiCallsCount?: number | null;
}

export interface CompanyDetail {
  _id: string;
  name: UserName;
  email: string;
  role: string;
  plan: string;
  maxToken: number;
  tokenUsage: number;
  website?: string;
  location?: string;
  isBlocked?: boolean;
  createdAt: string;


  recruiters?: number;
  openRoles?: number;
  hiresThisQ?: number;
  totalSearches?: number;


  searchActivity?: number[];
  searchActivityMonths?: string[];


  tokenHistory?: number[];
  tokenDays?: string[];

  
  mostSearchedRoles?: SearchedRole[];
  mostSearchedSkills?: SearchedSkill[];
}
