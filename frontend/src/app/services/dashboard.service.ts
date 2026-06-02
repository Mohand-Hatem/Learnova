import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { catchError, firstValueFrom, map, of } from 'rxjs';
import { environment } from '../../environments/environment';
import type { ApiDashboardPayload, ApiResponse, DashboardViewModel } from '../models/api.models';
import {
  AI_HEALTH,
  PLATFORM_ACTIVITY,
  RECENT_CVS,
  STATS,
  TOP_SKILLS,
  type AiHealthItem,
  type PlatformActivity,
  type RecentCv,
  type SkillItem,
  type StatCard,
} from '../components/dashboard/overview/dashboard.models';

interface AuthMeUser {
  name?: { en?: string; ar?: string };
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  readonly stats = signal<StatCard[]>(STATS);
  readonly recentCvs = signal<RecentCv[]>(RECENT_CVS);
  readonly topSkills = signal<SkillItem[]>(TOP_SKILLS);
  readonly platformActivity = signal<PlatformActivity>(PLATFORM_ACTIVITY);
  readonly aiHealth = signal<AiHealthItem[]>(AI_HEALTH);
  readonly userName = signal('Admin');
  readonly loading = signal(true);
  readonly isLive = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly sources = signal({
    stats: false,
    recentCvs: false,
    topSkills: false,
    platformActivity: false,
    aiHealth: false,
  });

  async load(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);

    try {
      const [dashboard, userName] = await Promise.all([
        this.fetchDashboard(),
        this.fetchUserName(),
      ]);

      const viewModel = dashboard ? dashboard : this.fallbackViewModel();

      this.stats.set(viewModel.stats);
      this.recentCvs.set(viewModel.recentCvs);
      this.topSkills.set(viewModel.topSkills);
      this.platformActivity.set(viewModel.platformActivity);
      this.aiHealth.set(viewModel.aiHealth);
      this.userName.set(userName);
      this.isLive.set(viewModel.isLive);
      this.sources.set(viewModel.sources);
      this.loading.set(false);

      if (!viewModel.isLive) {
        this.loadError.set('Using demo data — log in as admin to load live metrics.');
      }
    } catch {
      const viewModel = this.fallbackViewModel();

      this.stats.set(viewModel.stats);
      this.recentCvs.set(viewModel.recentCvs);
      this.topSkills.set(viewModel.topSkills);
      this.platformActivity.set(viewModel.platformActivity);
      this.aiHealth.set(viewModel.aiHealth);
      this.userName.set('Admin');
      this.isLive.set(false);
      this.sources.set(viewModel.sources);
      this.loading.set(false);
      this.loadError.set('Could not reach API — showing demo data.');
    }
  }

  private async fetchDashboard(): Promise<DashboardViewModel | null> {
    return firstValueFrom(
      this.http
        .get<ApiResponse<ApiDashboardPayload>>(`${this.baseUrl}/admin/dashboard`, {
          withCredentials: true,
        })
        .pipe(
          map((res) => this.mapPayload(res.data)),
          catchError(() => of(null)),
        ),
    );
  }

  private async fetchUserName(): Promise<string> {
    return firstValueFrom(
      this.http
        .get<ApiResponse<{ user: AuthMeUser }>>(`${this.baseUrl}/auth/me`, {
          withCredentials: true,
        })
        .pipe(
          map((res) => res.data.user?.name?.en?.split(' ')?.[0] ?? 'Admin'),
          catchError(() => of('Admin')),
        ),
    );
  }

  private mapPayload(data: ApiDashboardPayload): DashboardViewModel {
    const stats = data.stats.map(
      ({ key: _key, source: _source, ...card }): StatCard => card,
    );

    const recentCvs =
      data.recentCvs.length > 0
        ? data.recentCvs.map(({ source: _s, ...cv }) => cv)
        : RECENT_CVS;

    const topSkills = this.mapTopSkills(data);
    const platformActivity = data.platformActivity ?? PLATFORM_ACTIVITY;
    const aiHealth = this.mapAiHealth(data);

    return {
      stats,
      recentCvs,
      topSkills,
      platformActivity: {
        labels: platformActivity.labels ?? PLATFORM_ACTIVITY.labels,
        activeUsers: platformActivity.activeUsers,
        aiAnalyses: platformActivity.aiAnalyses,
      },
      aiHealth,
      userName: 'Admin',
      isLive: true,
      sources: {
        stats: true,
        recentCvs: data.recentCvs.length > 0,
        topSkills: topSkills !== TOP_SKILLS,
        platformActivity: data.platformActivity?.source === 'dynamic',
        aiHealth: aiHealth !== AI_HEALTH,
      },
    };
  }

  private mapTopSkills(data: ApiDashboardPayload): SkillItem[] {
    if (Array.isArray(data.topSkills) && data.topSkills.length > 0) {
      return data.topSkills.map(({ source: _s, ...skill }) => skill);
    }

    const fallback = (data as any).topSkills;
    if (Array.isArray(fallback?.items) && fallback.items.length > 0) {
      return fallback.items.map(({ source: _s, ...skill }: any) => skill);
    }

    return TOP_SKILLS;
  }

  private mapAiHealth(data: ApiDashboardPayload): AiHealthItem[] {
    if (Array.isArray((data as any).aiHealth)) {
      return (data as any).aiHealth.map(({ source: _s, ...item }: any) => item);
    }

    if (Array.isArray(data.aiHealth?.items) && data.aiHealth.items.length > 0) {
      return data.aiHealth.items.map(({ source: _s, ...item }: any) => item);
    }

    return AI_HEALTH;
  }

  private fallbackViewModel(): DashboardViewModel {
    return {
      stats: STATS,
      recentCvs: RECENT_CVS,
      topSkills: TOP_SKILLS,
      platformActivity: PLATFORM_ACTIVITY,
      aiHealth: AI_HEALTH,
      userName: 'Admin',
      isLive: false,
      sources: {
        stats: false,
        recentCvs: false,
        topSkills: false,
        platformActivity: false,
        aiHealth: false,
      },
    };
  }
}
