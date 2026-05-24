export interface StatCard {
  title: string;
  value: string;
  trendPercent: string;
  trendLabel: string;
  trendUp: boolean;
  sparkline: number[];
  icon: string;
}

export interface RecentCv {
  name: string;
  role: string;
  ats: number;
  status: 'Shortlisted' | 'Reviewing' | 'New';
  avatar: string;
}

export interface AiHealthItem {
  label: string;
  value: number;
}

export interface SkillItem {
  skill: string;
  count: number;
}

export interface PlatformActivity {
  labels: string[];
  activeUsers: number[];
  aiAnalyses: number[];
}

export interface NavItem {
  label: string;
  icon: string;
  route: string;
  active?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: 'layout-dashboard', route: '/dashboard', active: true },
  { label: 'Users', icon: 'users', route: '/dashboard/users' },
  { label: 'Companies', icon: 'building-2', route: '/dashboard/companies' },
  { label: 'AI Monitoring', icon: 'activity', route: '/dashboard/ai-monitoring' },
];

export const STATS: StatCard[] = [
  {
    title: 'TOTAL USERS',
    value: '48,219',
    trendPercent: '+12.4%',
    trendLabel: 'vs last week',
    trendUp: true,
    sparkline: [28, 42, 35, 52, 44, 58, 48, 62, 55, 68, 60, 72, 65, 78],
    icon: 'bi-people',
  },
  {
    title: 'COMPANIES',
    value: '1,284',
    trendPercent: '+5.1%',
    trendLabel: 'vs last week',
    trendUp: true,
    sparkline: [14, 19, 17, 25, 22, 29, 26, 33, 30, 36, 34, 40, 38, 44],
    icon: 'bi-building',
  },
  {
    title: 'CVs ANALYZED',
    value: '92,580',
    trendPercent: '+18.7%',
    trendLabel: 'vs last week',
    trendUp: true,
    sparkline: [30, 45, 42, 52, 49, 61, 57, 68, 65, 78, 74, 86, 81, 92],
    icon: 'bi-file-earmark-text',
  },
  {
    title: 'AI ANALYSES',
    value: '312k',
    trendPercent: '+22.3%',
    trendLabel: 'vs last week',
    trendUp: true,
    sparkline: [24, 38, 34, 50, 46, 58, 54, 68, 63, 77, 72, 86, 80, 95],
    icon: 'bi-brain',
  },
  {
    title: 'TOKENS USED',
    value: '4.82M',
    trendPercent: '-3.2%',
    trendLabel: 'vs last week',
    trendUp: false,
    sparkline: [60, 62, 61, 59, 58, 57, 56, 55, 54, 54, 53, 52, 52, 51],
    icon: 'bi-currency-dollar',
  },
  {
    title: 'ACTIVE NOW',
    value: '2,471',
    trendPercent: '+8.0%',
    trendLabel: 'vs last week',
    trendUp: true,
    sparkline: [18, 20, 22, 24, 27, 29, 31, 33, 35, 37, 39, 41, 43, 45],
    icon: 'bi-people-fill',
  },
];

export const RECENT_CVS: RecentCv[] = [
  {
    name: 'Sara Kassem',
    role: 'Senior Backend Engineer',
    ats: 94,
    status: 'Shortlisted',
    avatar: 'SK',
  },
  {
    name: 'Marcus Lee',
    role: 'ML Engineer',
    ats: 88,
    status: 'Reviewing',
    avatar: 'ML',
  },
  {
    name: 'Aicha Benali',
    role: 'Product Designer',
    ats: 81,
    status: 'New',
    avatar: 'AB',
  },
  {
    name: 'Diego Romero',
    role: 'DevOps Lead',
    ats: 76,
    status: 'Reviewing',
    avatar: 'DR',
  },
  {
    name: 'Yuki Tanaka',
    role: 'Data Scientist',
    ats: 69,
    status: 'New',
    avatar: 'YT',
  },
];

export const AI_HEALTH: AiHealthItem[] = [
  { label: 'Embedding API', value: 99.98 },
  { label: 'RAG Pipeline', value: 99.4 },
  { label: 'ATS Engine', value: 97.2 },
  { label: 'Semantic Search', value: 92.8 },
];

export const TOP_SKILLS: SkillItem[] = [
  { skill: 'Python', count: 4200 },
  { skill: 'React', count: 3800 },
  { skill: 'Node.js', count: 3200 },
  { skill: 'PostgreSQL', count: 2900 },
  { skill: 'AWS', count: 2500 },
  { skill: 'Docker', count: 2100 },
];

export const PLATFORM_ACTIVITY: PlatformActivity = {
  labels: Array.from({ length: 14 }, (_, i) => `Day ${String(i + 1).padStart(2, '0')}`),
  activeUsers: [320, 410, 380, 520, 490, 610, 580, 650, 620, 700, 680, 720, 750, 780],
  aiAnalyses: [180, 220, 260, 300, 340, 380, 420, 460, 500, 540, 580, 620, 660, 700],
};
