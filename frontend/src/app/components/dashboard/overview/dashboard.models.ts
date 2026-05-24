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
  { label: 'Users', icon: 'users', route: '/users' },
  { label: 'Companies', icon: 'building-2', route: '/companies' },
  { label: 'CVs', icon: 'file-text', route: '/cvs' },
  { label: 'Analytics', icon: 'bar-chart-3', route: '/analytics' },
  { label: 'AI Monitoring', icon: 'activity', route: '/ai-monitoring' },
  { label: 'Settings', icon: 'settings', route: '/settings' },
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
    trendPercent: '+4.1%',
    trendLabel: 'vs last week',
    trendUp: true,
    sparkline: [12, 18, 15, 22, 20, 26, 24, 30, 28, 34, 32, 38, 36, 42],
    icon: 'bi-building',
  },
  {
    title: 'CVs PROCESSED',
    value: '127,450',
    trendPercent: '+18.7%',
    trendLabel: 'vs last week',
    trendUp: true,
    sparkline: [35, 48, 42, 55, 50, 65, 58, 72, 68, 82, 75, 88, 80, 95],
    icon: 'bi-file-earmark-text',
  },
  {
    title: 'AI ANALYSES',
    value: '89,102',
    trendPercent: '+22.3%',
    trendLabel: 'vs last week',
    trendUp: true,
    sparkline: [22, 35, 30, 45, 40, 52, 48, 58, 54, 65, 60, 72, 68, 80],
    icon: 'bi-stars',
  },
  {
    title: 'AVG ATS SCORE',
    value: '78.4',
    trendPercent: '+2.1%',
    trendLabel: 'vs last week',
    trendUp: true,
    sparkline: [68, 72, 70, 74, 73, 76, 75, 78, 77, 79, 78, 80, 79, 81],
    icon: 'bi-bullseye',
  },
  {
    title: 'SHORTLISTED',
    value: '12,847',
    trendPercent: '-3.2%',
    trendLabel: 'vs last week',
    trendUp: false,
    sparkline: [52, 48, 50, 46, 48, 44, 46, 42, 44, 40, 42, 38, 40, 36],
    icon: 'bi-bookmark-star',
  },
];

export const RECENT_CVS: RecentCv[] = [
  {
    name: 'Sarah Mitchell',
    role: 'Senior Frontend Dev',
    ats: 94,
    status: 'Shortlisted',
    avatar: 'SM',
  },
  {
    name: 'James Chen',
    role: 'ML Engineer',
    ats: 88,
    status: 'Reviewing',
    avatar: 'JC',
  },
  {
    name: 'Elena Rodriguez',
    role: 'Product Manager',
    ats: 91,
    status: 'Shortlisted',
    avatar: 'ER',
  },
  {
    name: 'David Kim',
    role: 'DevOps Engineer',
    ats: 76,
    status: 'New',
    avatar: 'DK',
  },
  {
    name: 'Amira Hassan',
    role: 'Data Scientist',
    ats: 92,
    status: 'Shortlisted',
    avatar: 'AH',
  },
];

export const AI_HEALTH: AiHealthItem[] = [
  { label: 'Embedding API', value: 99.98 },
  { label: 'RAG Pipeline', value: 99.4 },
  { label: 'ATS Engine', value: 97.3 },
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
