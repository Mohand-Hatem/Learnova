// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface StatCard {
  title: string;
  value: string;
  trendPercent: string;
  trendLabel?: string;
  trendUp: boolean;
  sparkline?: number[];
  icon: string;
  color?: 'indigo' | 'emerald' | 'cyan' | 'violet' | 'amber';
  miniChartType?: 'line' | 'pie' | 'bar' | 'scatter';
  progressValue?: number;
}

export interface RecentCv {
  name: string;
  role: string;
  ats: number;
  status: 'Shortlisted' | 'Reviewing' | 'New';
  avatar: string;
  timeAgo?: string;
}

export interface AiHealthItem {
  label: string;
  value: number;
}

export interface SkillItem {
  skill: string;
  count: number;
  trend?: string;
  trendUp?: boolean;
  icon?: 'code' | 'cloud' | 'database' | 'cpu' | 'layers';
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

export interface TopPlan {
  name: string;
  percentage: number;
  color: string;
}

export interface TopCompany {
  name: string;
  searchType: string;
  count: number;
  initials: string;
  color: string;
}

// ─── Nav ──────────────────────────────────────────────────────────────────────

export const NAV_ITEMS: NavItem[] = [
  { label: 'Overview',     icon: 'layout-dashboard', route: '/dashboard/overview'     },
  { label: 'Admins',       icon: 'shield-check',     route: '/dashboard/admins'       },
  { label: 'Users',        icon: 'users',             route: '/dashboard/users'        },
  { label: 'Companies',    icon: 'building-2',        route: '/dashboard/companies'    },
  { label: 'AI Monitoring',icon: 'activity',          route: '/dashboard/ai-monitoring'},
];

// ─── Mock data ────────────────────────────────────────────────────────────────

export const STATS: StatCard[] = [
  {
    title: 'Total Users',
    value: '14,280',
    trendPercent: '+12%',
    trendUp: true,
    sparkline: [28, 34, 30, 40, 38, 45, 42, 50, 47, 55],
    icon: 'people',
    color: 'indigo',
  },
  {
    title: 'Total Companies',
    value: '842',
    trendPercent: '+5.2%',
    trendUp: true,
    sparkline: [20, 25, 22, 28, 26, 30, 32, 29, 35, 38],
    icon: 'building',
    color: 'violet',
  },
  {
    title: 'Total CVs',
    value: '124,500',
    trendPercent: '+24%',
    trendUp: true,
    sparkline: [40, 55, 48, 62, 58, 70, 65, 78, 72, 85],
    icon: 'file-text',
    color: 'cyan',
  },
  {
    title: 'Avg ATS Score',
    value: '84.2%',
    trendPercent: '+1.5%',
    trendUp: true,
    sparkline: [70, 72, 71, 74, 73, 75, 76, 75, 78, 80],
    icon: 'brain',
    color: 'emerald',
  },
  {
    title: 'AI Match Rate',
    value: '94%',
    trendPercent: '+3%',
    trendUp: true,
    sparkline: [80, 82, 85, 83, 87, 88, 90, 89, 92, 94],
    icon: 'dollar-sign',
    color: 'amber',
    progressValue: 94,
  },
];

export const RECENT_CVS: RecentCv[] = [
  { name: 'Jane Doe',    role: 'UI Designer',           ats: 92, status: 'Shortlisted', avatar: 'JD', timeAgo: '2m ago'  },
  { name: 'Mark Kim',    role: 'Backend Eng.',           ats: 88, status: 'Reviewing',  avatar: 'MK', timeAgo: '15m ago' },
  { name: 'Alex Smith',  role: 'DevOps',                 ats: 76, status: 'New',         avatar: 'AS', timeAgo: '45m ago' },
  { name: 'Sara Kassem', role: 'Senior Backend Engineer',ats: 94, status: 'Shortlisted', avatar: 'SK', timeAgo: '1h ago'  },
  { name: 'Diego Romero',role: 'DevOps Lead',            ats: 76, status: 'Reviewing',  avatar: 'DR', timeAgo: '2h ago'  },
];

export const AI_HEALTH: AiHealthItem[] = [
  { label: 'Embedding API',   value: 99.98 },
  { label: 'RAG Pipeline',    value: 99.4  },
  { label: 'ATS Engine',      value: 97.2  },
  { label: 'Semantic Search', value: 92.8  },
];

export const TOP_SKILLS: SkillItem[] = [
  { skill: 'React.js', count: 12400, trend: '+8%',  trendUp: true, icon: 'code'  },
  { skill: 'Python',   count: 9800,  trend: '+15%', trendUp: true, icon: 'code'  },
  { skill: 'AWS',      count: 7200,  trend: '+5%',  trendUp: true, icon: 'cloud' },
  { skill: 'Node.js',  count: 6500,  trend: '+12%', trendUp: true, icon: 'code'  },
];

export const PLATFORM_ACTIVITY: PlatformActivity = {
  labels:      ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb'],
  activeUsers: [320, 410, 380, 520, 490, 610, 580, 650, 620, 700, 680, 720, 750, 780],
  aiAnalyses:  [180, 220, 260, 300, 340, 380, 420, 460, 500, 540, 580, 620, 660, 700],
};

export const TOP_PLANS: TopPlan[] = [
  { name: 'Enterprise',   percentage: 42, color: '#6366f1' },
  { name: 'Professional', percentage: 38, color: '#22d3ee' },
  { name: 'Starter',      percentage: 20, color: '#64748b' },
];

export const TOP_COMPANIES: TopCompany[] = [
  { name: 'Microsoft', searchType: 'Searching: Frontend Eng.',   count: 2840, initials: 'MS', color: '#0078d4' },
  { name: 'Google',    searchType: 'Searching: Data Science',    count: 1920, initials: 'G',  color: '#ea4335' },
  { name: 'Amazon',    searchType: 'Searching: AWS Specialists', count: 1750, initials: 'A',  color: '#ff9900' },
];

export const AI_INSIGHT =
  "Matching efficiency is up 18% compared to last week. Based on current trends, we recommend prioritizing Senior React developers for Company X's recent expansion.";
