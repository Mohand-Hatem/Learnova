import type {
  AiHealthItem,
  PlatformActivity,
  RecentCv,
  SkillItem,
  StatCard,
} from '../components/dashboard/overview/dashboard.models';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface ApiStatCard extends StatCard {
  key?: string;
  source?: 'dynamic' | 'static';
}

export interface ApiRecentCv extends RecentCv {
  source?: 'dynamic' | 'static';
}

export interface ApiSkillItem extends SkillItem {
  source?: 'dynamic' | 'static';
}

export interface ApiDashboardPayload {
  stats: ApiStatCard[];
  recentCvs: ApiRecentCv[];
  topSkills: ApiSkillItem[] | null;
  platformActivity: PlatformActivity & { source?: 'dynamic' | 'static' };
  aiHealth: {
    items: AiHealthItem[];
    source: 'static' | 'dynamic';
    reason?: string;
  };
  meta?: {
    generatedAt?: string;
    endpoints?: Record<string, string>;
  };
}

export interface DashboardViewModel {
  stats: StatCard[];
  recentCvs: RecentCv[];
  topSkills: SkillItem[];
  platformActivity: PlatformActivity;
  aiHealth: AiHealthItem[];
  userName: string;
  isLive: boolean;
  sources: {
    stats: boolean;
    recentCvs: boolean;
    topSkills: boolean;
    platformActivity: boolean;
    aiHealth: boolean;
  };
}
