import {
  Component,
  inject,
  signal,
  computed,
  effect,
  OnInit,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { NgxEchartsDirective } from 'ngx-echarts';
import type { EChartsOption } from 'echarts';
import {
  LucideAngularModule,
  ChevronLeft, Download, ArrowUp, Ban,
  Mail, MapPin, Calendar, CheckCircle, AlertTriangle,
  Sparkles, FileText, ExternalLink,
  Trash2, Zap, CreditCard,
} from 'lucide-angular';
import { AdminService } from '../../../../services/admin.service';
import { PlanUpdateDialogComponent } from '../plan-update-dialog/plan-update-dialog.component';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { USER_PLANS } from '../user-plan.util';
import { ThemeService } from '../../../../services/theme.service';
import {
  chartThemeColors,
  planBadgeClass,
  USERS_CARD,
  USERS_DEMO_BADGE,
  USERS_DIALOG_PANEL,
  USERS_INPUT,
  USERS_MENU_FIXED,
  USERS_MENU_ITEM,
} from '../users-theme';
interface CV {
  _id: string;
  atsScore: number;
  processingStatus: string;
  originalFile?: { url?: string; fileName?: string; fileType?: string; fileSize?: number };
  aiAnalysis?: {
    summary?: string;
    strengths?: string[];
    weaknesses?: string[];
    suggestions?: string[];
  };
  parsedData?: {
    skills?: string[];
    experience?: { company: string; role: string; startDate: string; endDate: string }[];
    education?: { university: string; degree: string; field: string }[];
  };
  createdAt: string;
  updatedAt: string;
}

interface UserDetail {
  _id: string;
  name: { en: string; ar: string } | string;
  email: string;
  role: string;
  plan: string;
  maxToken: number;
  tokenUsage: number;
  location?: string;
  isBanned?: boolean;
  createdAt: string;
  cvs?: CV[];
}

const CHART_HEIGHT = 300;

function areaGradient(color: string, opacityFrom = 0.35) {
  return {
    type: 'linear' as const,
    x: 0,
    y: 0,
    x2: 0,
    y2: 1,
    colorStops: [
      { offset: 0, color: withAlpha(color, opacityFrom) },
      { offset: 0.9, color: withAlpha(color, 0.06) },
      { offset: 1, color: withAlpha(color, 0.02) },
    ],
  };
}

function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function baseGrid(): EChartsOption['grid'] {
  return {
    left: 48,
    right: 16,
    top: 24,
    bottom: 32,
    containLabel: true,
  };
}

function axisLabelStyle(color: string) {
  return { color, fontSize: 11, fontFamily: 'Inter, sans-serif' };
}

function splitLineStyle(color: string) {
  return { lineStyle: { color, type: 'dashed' as const } };
}

@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LucideAngularModule,
    MatDialogModule,
    MatButtonModule,
    NgxEchartsDirective,
  ],
  templateUrl: './user-detail.component.html',
})
export class UserDetailComponent implements OnInit {
  readonly ui = {
    card: USERS_CARD,
    input: USERS_INPUT,
    menu: USERS_MENU_FIXED,
    menuItem: USERS_MENU_ITEM,
    demoBadge: USERS_DEMO_BADGE,
  };
  readonly planBadgeClass = planBadgeClass;
  readonly chartInitOpts = { renderer: 'canvas' as const, height: CHART_HEIGHT };

  private adminService = inject(AdminService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private themeService = inject(ThemeService);

  icons = {
    ChevronLeft, Download, ArrowUp, Ban, Mail, MapPin, Calendar,
    CheckCircle, AlertTriangle, Sparkles, FileText, ExternalLink, Trash2, Zap, CreditCard,
  };

  user = signal<UserDetail | null>(null);
  loading = signal(true);
  readonly plans = [...USER_PLANS];

  readonly latestCv = computed(() => this.getLatestCV());

  skillsChartOptions = signal<EChartsOption | null>(null);
  tokenChartOptions = signal<EChartsOption | null>(null);
  atsChartOptions = signal<EChartsOption | null>(null);

  showPlanDropdown = signal(false);
  planMenuAnchor = signal<{ top: number; left: number; flipAbove: boolean } | null>(null);

  private readonly atsHistory = [55, 58, 62, 64, 67, 70, 73, 75, 78, 80, 84, 87];
  private readonly atsMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  private readonly tokenHistory = [320000, 580000, 410000, 920000, 1050000, 880000, 700000];
  private readonly tokenDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  constructor() {
    effect(() => {
      this.themeService.isDark();
      if (!this.user()) return;
      this.refreshChartOptions();
    });
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loading.set(false);
      return;
    }
    this.adminService.getUserById(id).subscribe({
      next: (res) => {
        this.user.set(res.data);
        this.refreshChartOptions();
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private refreshChartOptions(): void {
    this.tokenChartOptions.set(this.buildTokenChartOptions());
    this.atsChartOptions.set(this.buildAtsChartOptions());
    this.skillsChartOptions.set(this.buildSkillsChartOptions());
  }

  private buildTokenChartOptions(): EChartsOption {
    const theme = chartThemeColors(this.themeService.isDark());
    const maxVal = Math.max(...this.tokenHistory, 1);

    return {
      backgroundColor: 'transparent',
      grid: baseGrid(),
      tooltip: {
        trigger: 'axis',
        backgroundColor: this.themeService.isDark() ? '#1e293b' : '#ffffff',
        borderColor: theme.grid,
        textStyle: { color: theme.yLabel, fontSize: 12 },
        valueFormatter: (v) => this.formatTokens(Number(v)),
      },
      xAxis: {
        type: 'category',
        data: [...this.tokenDays],
        boundaryGap: false,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: axisLabelStyle(theme.label),
      },
      yAxis: {
        type: 'value',
        max: Math.ceil(maxVal * 1.15),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          ...axisLabelStyle(theme.label),
          formatter: (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)),
        },
        splitLine: splitLineStyle(theme.grid),
      },
      series: [
        {
          name: 'Tokens used',
          type: 'line',
          smooth: true,
          showSymbol: false,
          data: [...this.tokenHistory],
          lineStyle: { color: theme.primary, width: 2.5 },
          itemStyle: { color: theme.primary },
          areaStyle: { color: areaGradient(theme.primary) },
        },
      ],
    };
  }

  private buildAtsChartOptions(): EChartsOption {
    const theme = chartThemeColors(this.themeService.isDark());
    const markerStroke = this.themeService.isDark() ? '#0f1724' : '#ffffff';

    return {
      backgroundColor: 'transparent',
      grid: baseGrid(),
      tooltip: {
        trigger: 'axis',
        backgroundColor: this.themeService.isDark() ? '#1e293b' : '#ffffff',
        borderColor: theme.grid,
        textStyle: { color: theme.yLabel, fontSize: 12 },
      },
      xAxis: {
        type: 'category',
        data: [...this.atsMonths],
        boundaryGap: false,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: axisLabelStyle(theme.label),
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: axisLabelStyle(theme.label),
        splitLine: splitLineStyle(theme.grid),
      },
      series: [
        {
          name: 'ATS score',
          type: 'line',
          smooth: true,
          data: [...this.atsHistory],
          lineStyle: { color: theme.success, width: 2.5 },
          itemStyle: {
            color: theme.success,
            borderColor: markerStroke,
            borderWidth: 2,
          },
          symbol: 'circle',
          symbolSize: 8,
          areaStyle: { color: areaGradient(theme.success, 0.25) },
        },
      ],
    };
  }

  private buildSkillsChartOptions(): EChartsOption | null {
    const theme = chartThemeColors(this.themeService.isDark());
    const skills = this.cvSkills(this.latestCv()).slice(0, 8);
    if (skills.length < 1) return null;

    const scores = skills.map((_, i) => Math.round(55 + (i % 3) * 15));

    return {
      backgroundColor: 'transparent',
      grid: { left: 8, right: 24, top: 8, bottom: 8, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: this.themeService.isDark() ? '#1e293b' : '#ffffff',
        borderColor: theme.grid,
        textStyle: { color: theme.yLabel, fontSize: 12 },
      },
      xAxis: {
        type: 'value',
        max: 100,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: axisLabelStyle(theme.label),
        splitLine: splitLineStyle(theme.grid),
      },
      yAxis: {
        type: 'category',
        data: [...skills],
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { ...axisLabelStyle(theme.yLabel), fontSize: 12 },
      },
      series: [
        {
          name: 'Proficiency',
          type: 'bar',
          data: scores,
          barWidth: '60%',
          itemStyle: {
            color: theme.primary,
            borderRadius: [0, 6, 6, 0],
          },
        },
      ],
    };
  }

  cvSkills(cv: CV | null): string[] {
    return cv?.parsedData?.skills ?? [];
  }

  cvStrengths(cv: CV): string[] {
    return cv.aiAnalysis?.strengths ?? [];
  }

  cvWeaknesses(cv: CV): string[] {
    return cv.aiAnalysis?.weaknesses ?? [];
  }

  cvSuggestions(cv: CV): string[] {
    return cv.aiAnalysis?.suggestions ?? [];
  }

  getName(u: UserDetail): string {
    if (!u?.name) return '—';
    if (typeof u.name === 'string') return u.name;
    return u.name.en || u.name.ar || '—';
  }

  deleteUser() {
    const u = this.user();
    if (!u) return;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      panelClass: USERS_DIALOG_PANEL,
      data: {
        title: 'Delete user',
        message: `Are you sure you want to delete ${this.getName(u)}? This action cannot be undone.`,
        confirmLabel: 'Delete',
        confirmDanger: true,
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.adminService.deleteUser(u._id).subscribe({
        next: () => this.router.navigate(['/dashboard/users']),
      });
    });
  }

  togglePlanDropdown(event: Event) {
    event.stopPropagation();
    if (this.showPlanDropdown()) {
      this.closePlanDropdown();
      return;
    }
    this.showPlanDropdown.set(true);
    this.planMenuAnchor.set(
      this.computeMenuAnchor(event.currentTarget as HTMLElement, 160),
    );
  }

  closePlanDropdown() {
    this.showPlanDropdown.set(false);
    this.planMenuAnchor.set(null);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.showPlanDropdown()) return;
    const target = event.target as HTMLElement;
    if (
      target.closest('[data-plan-menu]') ||
      target.closest('[data-plan-menu-trigger]')
    ) {
      return;
    }
    this.closePlanDropdown();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (this.showPlanDropdown()) this.closePlanDropdown();
  }

  private computeMenuAnchor(
    trigger: HTMLElement,
    menuWidth: number,
  ): { top: number; left: number; flipAbove: boolean } {
    const rect = trigger.getBoundingClientRect();
    const estimatedHeight = 160;
    const gap = 6;
    let left = rect.right - menuWidth;
    left = Math.max(8, Math.min(left, window.innerWidth - menuWidth - 8));
    const spaceBelow = window.innerHeight - rect.bottom;
    const flipAbove = spaceBelow < estimatedHeight && rect.top > estimatedHeight;
    const top = flipAbove ? rect.top - gap : rect.bottom + gap;
    return { top, left, flipAbove };
  }

  selectPlan(plan: string) {
    const u = this.user();
    if (!u || plan === u.plan) return;

    this.closePlanDropdown();

    const dialogRef = this.dialog.open(PlanUpdateDialogComponent, {
      width: '420px',
      panelClass: USERS_DIALOG_PANEL,
      data: { user: u, newPlan: plan, isEnterprise: plan === 'Enterprise' },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.adminService.updatePlan(u._id, plan).subscribe({
        next: () => this.user.update((s) => (s ? { ...s, plan } : s)),
      });
    });
  }

  getInitials(u: UserDetail): string {
    return this.getName(u)
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  getLatestCV(): CV | null {
    const cvs = this.user()?.cvs;
    if (!cvs?.length) return null;
    return [...cvs].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )[0];
  }

  getAtsColor(score: number): string {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-error';
  }

  getAtsBarColor(score: number): string {
    if (score >= 80) return 'bg-success';
    if (score >= 60) return 'bg-warning';
    return 'bg-error';
  }

  getAtsLabel(score: number): string {
    if (score >= 80) return 'Excellent — above average';
    if (score >= 60) return 'Average — room for improvement';
    if (score === 0) return 'No CV uploaded yet';
    return 'Below average — major gaps detected';
  }

  getTokenPct(): number {
    const u = this.user();
    if (!u?.maxToken) return 0;
    return Math.min(Math.round((u.tokenUsage / u.maxToken) * 100), 100);
  }

  formatBytes(bytes?: number): string {
    if (!bytes) return '';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  timeAgo(date: string): string {
    const diff = Date.now() - new Date(date).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return '1 day ago';
    return `${days} days ago`;
  }

  formatTokens(n: number): string {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return String(n);
  }

  getRenewDate(): string {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  goBack() {
    this.router.navigate(['/dashboard/users']);
  }
}
