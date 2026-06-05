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
  ChevronLeft,
  ArrowUp,
  Trash2,
  Mail,
  Globe,
  MapPin,
  Building2,
  Zap,
  Users,
  Briefcase,
  TrendingUp,
  CreditCard,
  BarChart2,
  Sparkles,
} from 'lucide-angular';

import { CompanyService } from '../../../../services/company.service';
import { ThemeService } from '../../../../services/theme.service';

import { CompanyPlanUpdateDialogComponent } from '../plan-update-dialog/company-plan-update-dialog';
import { CompanyConfirmDialogComponent } from '../confirm-dialog/Company-confirm-dialog';

import { COMPANY_PLANS } from '../company-plan.util';

import {
  chartThemeColors,
  companyPlanBadgeClass,
  COMPANIES_CARD,
  COMPANIES_DIALOG_PANEL,
  COMPANIES_INPUT,
  COMPANIES_MENU_FIXED,
  COMPANIES_MENU_ITEM,
} from '../companies-theme';

interface SearchedRole  { role: string;  count: number; }
interface SearchedSkill { skill: string; count: number; }

interface CompanyDetail {
  _id: string;
  name: { en: string; ar: string } | string;
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

const CHART_HEIGHT = 360;

function withAlpha(hex: string, alpha: number): string {
  const h    = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r    = parseInt(full.slice(0, 2), 16);
  const g    = parseInt(full.slice(2, 4), 16);
  const b    = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function areaGradient(color: string, opacityFrom = 0.35) {
  return {
    type: 'linear' as const,
    x: 0, y: 0, x2: 0, y2: 1,
    colorStops: [
      { offset: 0,    color: withAlpha(color, opacityFrom) },
      { offset: 0.85, color: withAlpha(color, 0.08) },
      { offset: 1,    color: withAlpha(color, 0.02) },
    ],
  };
}

function axisLabelStyle(color: string) {
  return { color, fontSize: 11, fontFamily: 'Inter, sans-serif' };
}

function splitLineStyle(color: string) {
  return { lineStyle: { color, type: 'dashed' as const } };
}

function baseGrid(): EChartsOption['grid'] {
  return { left: 48, right: 16, top: 24, bottom: 32, containLabel: true };
}


@Component({
  selector: 'app-company-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LucideAngularModule,
    MatDialogModule,
    MatButtonModule,
    NgxEchartsDirective,
  ],
  templateUrl: './company-detail.components.html',
})
export class CompanyDetailComponent implements OnInit {

  readonly ui = {
    card:    COMPANIES_CARD,
    input:   COMPANIES_INPUT,
    menu:    COMPANIES_MENU_FIXED,
    menuItem: COMPANIES_MENU_ITEM,
  };

  readonly plans = [...COMPANY_PLANS];

  readonly chartInitOpts = { renderer: 'canvas' as const, height: CHART_HEIGHT };

  readonly planBadgeClass = companyPlanBadgeClass;

  private companyService = inject(CompanyService);
  private route          = inject(ActivatedRoute);
  private router         = inject(Router);
  private dialog         = inject(MatDialog);
  private themeService   = inject(ThemeService);

  icons = {
    ChevronLeft, ArrowUp, Trash2,
    Mail, Globe, MapPin, Building2,
    Zap, Users, Briefcase, TrendingUp,
    CreditCard, BarChart2, Sparkles,
  };

  company  = signal<CompanyDetail | null>(null);
  loading  = signal(true);
  error    = signal<string | null>(null);

  showPlanDropdown = signal(false);
  planMenuAnchor   = signal<{ top: number; left: number; flipAbove: boolean } | null>(null);

  searchActivityChartOptions  = signal<EChartsOption | null>(null);
  tokenConsumptionChartOptions = signal<EChartsOption | null>(null);
  rolesChartOptions            = signal<EChartsOption | null>(null);
  skillsChartOptions           = signal<EChartsOption | null>(null);

  readonly renewDate = computed(() => this.getRenewDate());

  constructor() {
    effect(() => {
      this.themeService.isDark();
      if (!this.company()) return;
      this.refreshChartOptions();
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.loading.set(false); this.error.set('Company not found'); return; }

    this.companyService.getCompanyById(id).subscribe({
      next: (res) => {
        this.company.set(res.data);
        this.refreshChartOptions();
        this.loading.set(false);
      },
      error: () => { this.error.set('Failed to load company'); this.loading.set(false); },
    });
  }

  private refreshChartOptions(): void {
    this.searchActivityChartOptions.set(this.buildSearchActivityChart());
    this.tokenConsumptionChartOptions.set(this.buildTokenConsumptionChart());
    this.rolesChartOptions.set(this.buildRolesChart());
    this.skillsChartOptions.set(this.buildSkillsChart());
  }

  private buildSearchActivityChart(): EChartsOption | null {
    const c = this.company();
    if (!c?.searchActivity?.length) return null;

    const theme = chartThemeColors(this.themeService.isDark());
    return {
      backgroundColor: 'transparent',
      grid: baseGrid(),
      tooltip: {
        trigger: 'axis',
        backgroundColor: this.themeService.isDark() ? '#0f172a' : '#ffffff',
        borderColor: theme.grid,
        textStyle: { color: theme.yLabel, fontSize: 12 },
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: c.searchActivityMonths ?? [],
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: axisLabelStyle(theme.label),
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: axisLabelStyle(theme.label),
        splitLine: splitLineStyle(theme.grid),
      },
      series: [{
        type: 'line',
        smooth: true,
        showSymbol: false,
        data: c.searchActivity,
        lineStyle: { color: theme.primary, width: 3 },
        itemStyle: { color: theme.primary },
        areaStyle: { color: areaGradient(theme.primary) },
      }],
    };
  }

  private buildTokenConsumptionChart(): EChartsOption | null {
    const c = this.company();
    if (!c?.tokenHistory?.length) return null;

    const theme  = chartThemeColors(this.themeService.isDark());
    const maxVal = Math.max(...c.tokenHistory, 1);

    return {
      backgroundColor: 'transparent',
      grid: { left: 56, right: 16, top: 16, bottom: 32, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: this.themeService.isDark() ? '#0f172a' : '#ffffff',
        borderColor: theme.grid,
        textStyle: { color: theme.yLabel, fontSize: 12 },
        valueFormatter: (v) => this.formatTokens(Number(v)),
      },
      xAxis: {
        type: 'category',
        data: c.tokenDays ?? [],
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: axisLabelStyle(theme.label),
      },
      yAxis: {
        type: 'value',
        max: Math.ceil(maxVal * 1.2),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          ...axisLabelStyle(theme.label),
          formatter: (v: number) => {
            if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
            if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}k`;
            return String(v);
          },
        },
        splitLine: splitLineStyle(theme.grid),
      },
      series: [{
        type: 'bar',
        data: c.tokenHistory,
        barWidth: '56%',
        itemStyle: { color: theme.primary, borderRadius: [8, 8, 0, 0] },
      }],
    };
  }

  private buildRolesChart(): EChartsOption | null {
    const c = this.company();
    if (!c?.mostSearchedRoles?.length) return null;

    const theme = chartThemeColors(this.themeService.isDark());
    const roles = c.mostSearchedRoles.slice(0, 6);

    return {
      backgroundColor: 'transparent',
      grid: { left: 8, right: 16, top: 8, bottom: 8, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: this.themeService.isDark() ? '#0f172a' : '#ffffff',
        borderColor: theme.grid,
        textStyle: { color: theme.yLabel, fontSize: 12 },
      },
      xAxis: {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: axisLabelStyle(theme.label),
        splitLine: splitLineStyle(theme.grid),
      },
      yAxis: {
        type: 'category',
        data: roles.map((r) => r.role).reverse(),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { ...axisLabelStyle(theme.yLabel), fontSize: 11 },
      },
      series: [{
        type: 'bar',
        data: roles.map((r) => r.count).reverse(),
        barWidth: '60%',
        itemStyle: { color: theme.primary, borderRadius: [0, 8, 8, 0] },
      }],
    };
  }

  private buildSkillsChart(): EChartsOption | null {
    const c = this.company();
    if (!c?.mostSearchedSkills?.length) return null;

    const theme  = chartThemeColors(this.themeService.isDark());
    const skills = c.mostSearchedSkills.slice(0, 6);

    return {
      backgroundColor: 'transparent',
      grid: { left: 8, right: 16, top: 8, bottom: 8, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: this.themeService.isDark() ? '#0f172a' : '#ffffff',
        borderColor: theme.grid,
        textStyle: { color: theme.yLabel, fontSize: 12 },
      },
      xAxis: {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          ...axisLabelStyle(theme.label),
          formatter: (v: number) => v >= 1_000 ? `${(v / 1_000).toFixed(1)}k` : String(v),
        },
        splitLine: splitLineStyle(theme.grid),
      },
      yAxis: {
        type: 'category',
        data: skills.map((s) => s.skill).reverse(),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { ...axisLabelStyle(theme.yLabel), fontSize: 11 },
      },
      series: [{
        type: 'bar',
        data: skills.map((s) => s.count).reverse(),
        barWidth: '60%',
        itemStyle: { color: theme.primary, borderRadius: [0, 8, 8, 0] },
      }],
    };
  }

  getName(c: CompanyDetail): string {
    if (!c?.name) return '—';
    if (typeof c.name === 'string') return c.name;
    return c.name.en || c.name.ar || '—';
  }

  getInitials(c: CompanyDetail): string {
    return this.getName(c).split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  }

  getTokenPct(): number {
    const c = this.company();
    if (!c?.maxToken) return 0;
    return Math.min(Math.round((c.tokenUsage / c.maxToken) * 100), 100);
  }

  formatTokens(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'k';
    return String(n);
  }

  getRenewDate(): string {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }


  togglePlanDropdown(event: Event): void {
    event.stopPropagation();
    if (this.showPlanDropdown()) { this.closePlanDropdown(); return; }
    this.showPlanDropdown.set(true);
    this.planMenuAnchor.set(this.computeMenuAnchor(event.currentTarget as HTMLElement, 160));
  }

  closePlanDropdown(): void {
    this.showPlanDropdown.set(false);
    this.planMenuAnchor.set(null);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.showPlanDropdown()) return;
    const target = event.target as HTMLElement;
    if (target.closest('[data-plan-menu]') || target.closest('[data-plan-menu-trigger]')) return;
    this.closePlanDropdown();
  }

  @HostListener('window:resize')
  onWindowResize(): void { if (this.showPlanDropdown()) this.closePlanDropdown(); }

  private computeMenuAnchor(trigger: HTMLElement, menuWidth: number) {
    const rect          = trigger.getBoundingClientRect();
    const estimatedH    = 160;
    const gap           = 6;
    let left            = rect.right - menuWidth;
    left                = Math.max(8, Math.min(left, window.innerWidth - menuWidth - 8));
    const spaceBelow    = window.innerHeight - rect.bottom;
    const flipAbove     = spaceBelow < estimatedH && rect.top > estimatedH;
    const top           = flipAbove ? rect.top - gap : rect.bottom + gap;
    return { top, left, flipAbove };
  }

  selectPlan(plan: string): void {
    const c = this.company();
    if (!c || plan === c.plan) return;
    this.closePlanDropdown();

    const dialogRef = this.dialog.open(CompanyPlanUpdateDialogComponent, {
      width: '420px',
      panelClass: COMPANIES_DIALOG_PANEL,
      data: {
        company:      { name: this.getName(c), email: c.email, plan: c.plan },
        newPlan:      plan,
        isEnterprise: plan === 'Enterprise',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.companyService.updateCompanyPlan(c._id, plan).subscribe({
        next: () => this.company.update((s) => s ? { ...s, plan } : s),
      });
    });
  }

  deleteCompany(): void {
    const c = this.company();
    if (!c) return;

    const dialogRef = this.dialog.open(CompanyConfirmDialogComponent, {
      width: '420px',
      panelClass: COMPANIES_DIALOG_PANEL,
      data: {
        title:        'Delete company',
        message:      `Are you sure you want to delete ${this.getName(c)}? This action cannot be undone.`,
        confirmLabel: 'Delete',
        confirmDanger: true,
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.companyService.deleteCompany(c._id).subscribe({
        next: () => this.router.navigate(['/dashboard/companies']),
      });
    });
  }

  goBack(): void { this.router.navigate(['/dashboard/companies']); }
}
