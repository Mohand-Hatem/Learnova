import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { catchError, firstValueFrom, map, of } from 'rxjs';
import { environment } from '../../environments/environment';
import type { ApiDashboardPayload, ApiResponse, DashboardViewModel } from '../models/api.models';
import {
  type AiHealthItem,
  type PlatformActivity,
  type RecentCv,
  type SkillItem,
  type StatCard,
  type TopCompany,
  type TopPlan,
} from '../components/dashboard/overview/dashboard.models';

interface AuthMeUser {
  name?: { en?: string; ar?: string };
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;
  private readonly companyColors = ['#6366f1', '#06b6d4', '#22c55e', '#f59e0b', '#ec4899'];

  readonly stats = signal<StatCard[]>([]);
  readonly recentCvs = signal<RecentCv[]>([]);
  readonly topSkills = signal<SkillItem[]>([]);
  readonly platformActivity = signal<PlatformActivity>({
    labels: [],
    activeUsers: [],
    aiAnalyses: [],
  });
  readonly aiHealth = signal<AiHealthItem[]>([]);
  readonly userName         = signal('Admin');
  readonly loading          = signal(true);
  readonly isLive           = signal(true);
  readonly loadError        = signal<string | null>(null);
  readonly sources          = signal({
    hasStats: false,
    hasRecentCvs: false,
    hasTopSkills: false,
    hasPlatformActivity: false,
    hasTopPlans: false,
    hasTopCompanies: false,
  });

  readonly topPlans = signal<TopPlan[]>([]);
  readonly topPlansTotal = signal(0);
  readonly topCompanies = signal<TopCompany[]>([]);
  readonly aiInsight = signal<string>('No platform insights yet. Upload more CVs to unlock trend analysis.');

  async load(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);

    try {
      const [dashboard, userName] = await Promise.all([
        this.fetchDashboard(),
        this.fetchUserName(),
      ]);

      if (!dashboard) {
        this.resetToEmpty(userName);
        this.loadError.set('Could not load dashboard data from backend.');
        this.loading.set(false);
        return;
      }

      this.stats.set(dashboard.stats);
      this.recentCvs.set(dashboard.recentCvs);
      this.topSkills.set(dashboard.topSkills);
      this.platformActivity.set(dashboard.platformActivity);
      this.aiHealth.set(dashboard.aiHealth);
      this.topPlans.set(dashboard.topPlans);
      this.topPlansTotal.set(dashboard.topPlansTotal);
      this.topCompanies.set(dashboard.topCompanies);
      this.aiInsight.set(dashboard.aiInsight);
      this.userName.set(userName);
      this.sources.set(dashboard.sources);
      this.isLive.set(true);
      this.loading.set(false);
    } catch {
      this.resetToEmpty('Admin');
      this.isLive.set(false);
      this.loading.set(false);
      this.loadError.set('Could not load dashboard data from backend.');
    }
  }

  private async fetchDashboard(): Promise<DashboardViewModel | null> {
    return firstValueFrom(
      this.http
        .get<ApiResponse<ApiDashboardPayload>>(`${this.baseUrl}/admin/stats/overview`, { withCredentials: true })
        .pipe(
          map((res) => this.mapPayload(res.data)),
          catchError(() => of(null)),
        ),
    );
  }

  private async fetchUserName(): Promise<string> {
    return firstValueFrom(
      this.http
        .get<ApiResponse<{ user: AuthMeUser }>>(`${this.baseUrl}/auth/me`, { withCredentials: true })
        .pipe(
          map((res) => res.data.user?.name?.en?.split(' ')?.[0] ?? 'Admin'),
          catchError(() => of('Admin')),
        ),
    );
  }

  private mapPayload(data: ApiDashboardPayload): DashboardViewModel {
    const stats = this.mapStats(data);
    const topPlans = this.mapTopPlans(data);
    const topSkills = this.mapTopSkills(data);
    const platformActivity = this.mapPlatformActivity(data);
    const recentCvs = this.mapRecentCvs(data);
    const topCompanies = this.mapTopCompanies(data);
    const aiHealth = this.mapAiHealth(data);
    const aiInsight = this.buildInsight(data);

    return {
      stats,
      recentCvs,
      topSkills,
      platformActivity,
      aiHealth,
      topPlans,
      topPlansTotal: Number(data.byPlan.enterprise || 0) + Number(data.byPlan.pro || 0) + Number(data.byPlan.free || 0),
      topCompanies,
      aiInsight,
      userName: 'Admin',
      sources: {
        hasStats: stats.length > 0,
        hasRecentCvs: recentCvs.length > 0,
        hasTopSkills: topSkills.length > 0,
        hasPlatformActivity: platformActivity.labels.length > 0,
        hasTopPlans: topPlans.length > 0,
        hasTopCompanies: topCompanies.length > 0,
      },
    };
  }

  private mapTopSkills(data: ApiDashboardPayload): SkillItem[] {
    if (!Array.isArray(data.topSkills)) return [];
    return data.topSkills.map((skill, index) => ({
      skill: skill.skill,
      count: Number(skill.count) || 0,
      icon: (['code', 'cloud', 'database', 'cpu', 'layers'] as const)[index % 5],
    }));
  }

  private mapStats(data: ApiDashboardPayload): StatCard[] {
    const s = data.stats;
    const makeTrend = (value?: number) => {
      if (typeof value !== 'number') return { trendPercent: '', trendUp: true };
      return {
        trendPercent: `${value > 0 ? '+' : ''}${value}%`,
        trendUp: value >= 0,
      };
    };

    return [
      {
        title: 'Total Users',
        value: this.formatNumber(s.totalUsers.value),
        ...makeTrend(s.totalUsers.changePercent),
        icon: 'people',
        color: 'indigo',
      },
      {
        title: 'Total Companies',
        value: this.formatNumber(s.totalCompanies.value),
        ...makeTrend(s.totalCompanies.changePercent),
        icon: 'building',
        color: 'violet',
      },
      {
        title: 'Total CVs',
        value: this.formatNumber(s.totalCVs.value),
        ...makeTrend(s.totalCVs.changePercent),
        icon: 'file-text',
        color: 'cyan',
      },
      {
        title: 'Avg ATS Score',
        value: `${(Number(s.avgAtsScore.value) || 0).toFixed(1)}%`,
        trendPercent: '',
        trendUp: true,
        icon: 'brain',
        color: 'emerald',
      },
      {
        title: 'AI Match Rate',
        value: `${(Number(s.aiMatchRate.value) || 0).toFixed(1)}%`,
        trendPercent: '',
        trendUp: true,
        icon: 'dollar-sign',
        color: 'amber',
        progressValue: Math.max(0, Math.min(100, Number(s.aiMatchRate.value) || 0)),
      },
    ];
  }

  private mapTopPlans(data: ApiDashboardPayload): TopPlan[] {
    const planCounts = [
      { name: 'Enterprise', count: Number(data.byPlan.enterprise) || 0, color: '#6366f1' },
      { name: 'Pro', count: Number(data.byPlan.pro) || 0, color: '#22d3ee' },
      { name: 'Free', count: Number(data.byPlan.free) || 0, color: '#64748b' },
    ];
    const total = planCounts.reduce((sum, p) => sum + p.count, 0);
    if (total === 0) return [];

    return planCounts
      .filter((p) => p.count > 0)
      .map((p) => ({
        name: p.name,
        percentage: Math.round((p.count / total) * 100),
        color: p.color,
      }));
  }

  private mapPlatformActivity(data: ApiDashboardPayload): PlatformActivity {
    const active = new Map((data.charts.activeUsersPerMonth ?? []).map((item) => [item._id, Number(item.count) || 0]));
    const analyses = new Map((data.charts.aiAnalysesPerMonth ?? []).map((item) => [item._id, Number(item.count) || 0]));
    const labels = [...new Set([...active.keys(), ...analyses.keys()])].sort();

    if (!labels.length) {
      return { labels: [], activeUsers: [], aiAnalyses: [] };
    }

    return {
      labels: labels.map((label) => label.slice(2)),
      activeUsers: labels.map((label) => active.get(label) ?? 0),
      aiAnalyses: labels.map((label) => analyses.get(label) ?? 0),
    };
  }

  private mapRecentCvs(data: ApiDashboardPayload): RecentCv[] {
    if (!Array.isArray(data.recentCVs)) return [];

    return data.recentCVs.map((cv) => {
      const score = Number(cv.atsScore) || 0;
      return {
        name: this.readLocalizedName(cv.candidate),
        role: cv.fileName || 'CV',
        ats: score,
        status: score >= 85 ? 'Shortlisted' : score >= 70 ? 'Reviewing' : 'New',
        avatar: this.extractInitials(this.readLocalizedName(cv.candidate)),
        timeAgo: this.timeAgo(cv.analyzedAt),
      };
    });
  }

  private mapTopCompanies(data: ApiDashboardPayload): TopCompany[] {
    if (!Array.isArray(data.topCompanies)) return [];

    return data.topCompanies.map((company, index) => {
      const name = this.readLocalizedName(company.name);
      const count = Number(company.cvCount) || 0;
      return {
        name,
        searchType: 'Uploaded CVs',
        count,
        initials: this.extractInitials(name),
        color: this.companyColors[index % this.companyColors.length],
      };
    });
  }

  private mapAiHealth(data: ApiDashboardPayload): AiHealthItem[] {
    const statuses = data.cvsByStatus;
    const total = Object.values(statuses).reduce((sum, count) => sum + (Number(count) || 0), 0);
    if (!total) return [];

    const pct = (value: number) => Number(((value / total) * 100).toFixed(1));
    return [
      { label: 'Uploaded', value: pct(statuses.uploaded) },
      { label: 'Processing', value: pct(statuses.processing) },
      { label: 'Analyzed', value: pct(statuses.analyzed) },
      { label: 'Failed', value: pct(statuses.failed) },
    ];
  }

  private buildInsight(data: ApiDashboardPayload): string {
    const users = Number(data.stats.totalUsers.value) || 0;
    const cvs = Number(data.stats.totalCVs.value) || 0;
    const match = Number(data.stats.aiMatchRate.value) || 0;

    if (!users && !cvs) {
      return 'No dashboard data yet. Once users upload CVs, platform insights will appear here.';
    }

    return `Platform has ${this.formatNumber(users)} users, ${this.formatNumber(cvs)} CVs, and ${match.toFixed(1)}% AI match rate.`;
  }

  private formatNumber(value: number): string {
    return (Number(value) || 0).toLocaleString('en-US');
  }

  private readLocalizedName(name: { en?: string; ar?: string } | string | null | undefined): string {
    if (!name) return 'Unknown';
    if (typeof name === 'string') return name;
    return name.en || name.ar || 'Unknown';
  }

  private extractInitials(name: string): string {
    return name
      .split(' ')
      .map((part) => part.trim()[0])
      .filter(Boolean)
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  private timeAgo(isoDate?: string): string {
    if (!isoDate) return '—';
    const diff = Date.now() - new Date(isoDate).getTime();
    if (!Number.isFinite(diff) || diff < 0) return '—';
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${Math.max(mins, 1)}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  private resetToEmpty(userName: string): void {
    this.stats.set([]);
    this.recentCvs.set([]);
    this.topSkills.set([]);
    this.platformActivity.set({ labels: [], activeUsers: [], aiAnalyses: [] });
    this.aiHealth.set([]);
    this.topPlans.set([]);
    this.topPlansTotal.set(0);
    this.topCompanies.set([]);
    this.aiInsight.set('No platform insights yet. Upload more CVs to unlock trend analysis.');
    this.userName.set(userName);
    this.sources.set({
      hasStats: false,
      hasRecentCvs: false,
      hasTopSkills: false,
      hasPlatformActivity: false,
      hasTopPlans: false,
      hasTopCompanies: false,
    });
  }
}
