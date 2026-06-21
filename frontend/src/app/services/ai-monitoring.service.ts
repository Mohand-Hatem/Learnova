import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, firstValueFrom, map, of } from 'rxjs';
import { environment } from '../../environments/environment';
import type {
  ApiAiStatsPayload,
  ApiResponse,
} from '../models/api.models';
import type { StatCard } from '../components/dashboard/overview/dashboard.models';

export interface AiTopUserView {
  rank: number;
  name: string;
  searches: number;
  plan: string;
}

export interface AiMonthlyView {
  labels: string[];
  aiCalls: number[];
  totalTokens: number[];
}

@Injectable({ providedIn: 'root' })
export class AiMonitoringService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  readonly statCards = signal<StatCard[]>([]);
  readonly tokenBreakdown = signal({
    embedding: 0,
    prompt: 0,
    completion: 0,
  });
  readonly monthly = signal<AiMonthlyView>({
    labels: [],
    aiCalls: [],
    totalTokens: [],
  });
  readonly topUsers = signal<AiTopUserView[]>([]);

  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);

  readonly hasStats = signal(false);
  readonly hasTokenBreakdown = signal(false);
  readonly hasMonthly = signal(false);
  readonly hasTopUsers = signal(false);

  async load(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);

    const payload = await firstValueFrom(
      this.http
        .get<ApiResponse<ApiAiStatsPayload>>(`${this.baseUrl}/admin/stats/ai`, { withCredentials: true })
        .pipe(
          map((res) => res.data),
          catchError(() => of(null)),
        ),
    );

    if (!payload) {
      this.resetEmpty();
      this.loading.set(false);
      this.loadError.set('Could not load AI monitoring data from backend.');
      return;
    }

    this.statCards.set(this.mapStatCards(payload));
    this.tokenBreakdown.set({
      embedding: Number(payload.tokenBreakdown?.embedding) || 0,
      prompt: Number(payload.tokenBreakdown?.prompt) || 0,
      completion: Number(payload.tokenBreakdown?.completion) || 0,
    });
    this.monthly.set(this.mapMonthly(payload));
    this.topUsers.set(this.mapTopUsers(payload));

    this.hasStats.set(this.statCards().length > 0);
    this.hasTokenBreakdown.set(
      this.tokenBreakdown().embedding > 0 ||
        this.tokenBreakdown().prompt > 0 ||
        this.tokenBreakdown().completion > 0,
    );
    this.hasMonthly.set(this.monthly().labels.length > 0);
    this.hasTopUsers.set(this.topUsers().length > 0);
    this.loading.set(false);
  }

  private mapStatCards(data: ApiAiStatsPayload): StatCard[] {
    const stats = data.stats;
    const monthly = Array.isArray(data.charts?.monthly) ? [...data.charts.monthly] : [];
    const orderedMonthly = monthly.sort((a, b) => a._id.localeCompare(b._id));
    const sparkCalls = orderedMonthly.map((m) => Number(m.aiCalls) || 0).slice(-12);
    const sparkTokens = orderedMonthly.map((m) => Number(m.totalTokens) || 0).slice(-12);
    const sparkResponse = orderedMonthly.map((m) => Number(m.avgResponseTimeMs) || 0).slice(-12);
    const sparkSuccess = orderedMonthly.map((m) => Number(m.successRate) || 0).slice(-12);
    const trend = (value: number) => ({
      trendPercent: `${value > 0 ? '+' : ''}${value}%`,
      trendUp: value >= 0,
    });

    return [
      {
        title: 'AI Calls',
        value: this.formatCompact(stats.totalAiCalls.value),
        ...trend(stats.totalAiCalls.changePercent),
        sparkline: sparkCalls.length ? sparkCalls : [8, 9, 10, 12, 13, 14, 15, 16, 17, 18],
        icon: 'activity',
        color: 'indigo',
        miniChartType: 'line',
      },
      {
        title: 'Token Spend',
        value: this.formatCompact(stats.tokenSpend.value),
        ...trend(stats.tokenSpend.changePercent),
        sparkline: sparkTokens.length ? sparkTokens : [24, 28, 30, 35, 34, 38, 42, 40, 45, 48],
        icon: 'zap',
        color: 'cyan',
        miniChartType: 'bar',
      },
      {
        title: 'Avg Response Time',
        value: this.formatDuration(stats.avgResponseTime.valueMs),
        ...trend(-stats.avgResponseTime.changePercent),
        sparkline: sparkResponse.length ? sparkResponse : [900, 860, 810, 780, 740, 710, 690, 660, 640, 620],
        icon: 'clock',
        color: 'violet',
        miniChartType: 'scatter',
      },
      {
        title: 'Success Rate',
        value: `${(Number(stats.successRate.value) || 0).toFixed(1)}%`,
        ...trend(stats.successRate.changePercent),
        sparkline: sparkSuccess.length ? sparkSuccess : [78, 80, 81, 83, 84, 86, 87, 88, 89, 91],
        icon: 'shield',
        color: 'emerald',
        miniChartType: 'pie',
      },
    ];
  }

  private mapMonthly(data: ApiAiStatsPayload): AiMonthlyView {
    const monthly = Array.isArray(data.charts?.monthly) ? data.charts.monthly : [];
    const ordered = [...monthly].sort((a, b) => a._id.localeCompare(b._id));
    return {
      labels: ordered.map((m) => m._id.slice(2)),
      aiCalls: ordered.map((m) => Number(m.aiCalls) || 0),
      totalTokens: ordered.map((m) => Number(m.totalTokens) || 0),
    };
  }

  private mapTopUsers(data: ApiAiStatsPayload): AiTopUserView[] {
    const users = Array.isArray(data.topUsers) ? data.topUsers : [];
    return users.map((user, index) => ({
      rank: index + 1,
      name: this.readName(user.name),
      searches: Number(user.aiCalls) || 0,
      plan: user.plan || '—',
    }));
  }

  private readName(name: { en?: string; ar?: string } | string): string {
    if (typeof name === 'string') return name || 'Unknown';
    return name?.en || name?.ar || 'Unknown';
  }

  private formatCompact(value: number): string {
    return Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value) || 0);
  }

  private formatDuration(ms: number): string {
    const value = Number(ms) || 0;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}s`;
    return `${Math.round(value)}ms`;
  }

  private resetEmpty(): void {
    this.statCards.set([]);
    this.tokenBreakdown.set({ embedding: 0, prompt: 0, completion: 0 });
    this.monthly.set({ labels: [], aiCalls: [], totalTokens: [] });
    this.topUsers.set([]);
    this.hasStats.set(false);
    this.hasTokenBreakdown.set(false);
    this.hasMonthly.set(false);
    this.hasTopUsers.set(false);
  }
}
