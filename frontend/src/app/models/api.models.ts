import type {
  AiHealthItem,
  PlatformActivity,
  RecentCv,
  SkillItem,
  StatCard,
  TopCompany,
  TopPlan,
} from '../components/dashboard/overview/dashboard.models';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface ApiOverviewMetric {
  value: number;
  changePercent?: number;
}

export interface ApiOverviewStats {
  totalUsers: ApiOverviewMetric;
  totalAdmins: ApiOverviewMetric;
  totalCompanies: ApiOverviewMetric;
  totalCVs: ApiOverviewMetric;
  avgAtsScore: { value: number };
  aiMatchRate: { value: number };
}

export interface ApiPlanBreakdown {
  free: number;
  pro: number;
  enterprise: number;
}

export interface ApiCvStatusBreakdown {
  uploaded: number;
  processing: number;
  analyzed: number;
  failed: number;
}

export interface ApiMonthlyCount {
  _id: string;
  count: number;
}

export interface ApiOverviewCharts {
  activeUsersPerMonth: ApiMonthlyCount[];
  aiAnalysesPerMonth: ApiMonthlyCount[];
}

export interface ApiOverviewSkill {
  skill: string;
  count: number;
}

export interface ApiOverviewRecentCv {
  candidate: { en?: string; ar?: string } | string;
  avatar?: string | null;
  fileName?: string;
  atsScore: number;
  analyzedAt?: string;
}

export interface ApiOverviewCompany {
  name: { en?: string; ar?: string } | string;
  cvCount: number;
}

export interface ApiDashboardPayload {
  stats: ApiOverviewStats;
  byPlan: ApiPlanBreakdown;
  cvsByStatus: ApiCvStatusBreakdown;
  charts: ApiOverviewCharts;
  topSkills: ApiOverviewSkill[];
  recentCVs: ApiOverviewRecentCv[];
  topCompanies: ApiOverviewCompany[];
}

export interface DashboardViewModel {
  stats: StatCard[];
  recentCvs: RecentCv[];
  topSkills: SkillItem[];
  platformActivity: PlatformActivity;
  aiHealth: AiHealthItem[];
  topPlans: TopPlan[];
  topPlansTotal: number;
  topCompanies: TopCompany[];
  aiInsight: string;
  userName: string;
  sources: {
    hasStats: boolean;
    hasRecentCvs: boolean;
    hasTopSkills: boolean;
    hasPlatformActivity: boolean;
    hasTopPlans: boolean;
    hasTopCompanies: boolean;
  };
}

export interface ApiAiMetric {
  value: number;
  changePercent: number;
}

export interface ApiAiStats {
  totalAiCalls: ApiAiMetric;
  tokenSpend: ApiAiMetric & { estimatedCostUSD: number };
  avgResponseTime: { valueMs: number; changePercent: number };
  successRate: ApiAiMetric;
}

export interface ApiAiTokenBreakdown {
  embedding: number;
  prompt: number;
  completion: number;
}

export interface ApiAiMonthlyPoint {
  _id: string;
  aiCalls: number;
  totalTokens: number;
  avgResponseTimeMs: number;
  successRate: number;
}

export interface ApiAiTopUser {
  name: { en?: string; ar?: string } | string;
  email?: string;
  plan?: string;
  avatar?: string | null;
  totalTokens: number;
  aiCalls: number;
  avgResponseTimeMs: number;
}

export interface ApiAiStatsPayload {
  stats: ApiAiStats;
  tokenBreakdown: ApiAiTokenBreakdown;
  charts: { monthly: ApiAiMonthlyPoint[] };
  topUsers: ApiAiTopUser[];
}
