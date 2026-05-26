import {
  Component,
  inject,
  signal,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  PLATFORM_ID,
  effect,
} from '@angular/core';
import { isPlatformBrowser, DecimalPipe, NgClass } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import * as echarts from 'echarts';

import { CompanyService } from '../../../services/company.service';
import { Company, CompanyStatus } from '../../../models/company.model';

@Component({
  selector: 'app-company-details',
  standalone: true,
  imports: [DecimalPipe, NgClass],
  templateUrl: './company-details.component.html',
})
export class CompanyDetailsComponent implements OnInit, OnDestroy {
  private readonly route          = inject(ActivatedRoute);
  private readonly router         = inject(Router);
  private readonly companyService = inject(CompanyService);
  private readonly platformId     = inject(PLATFORM_ID);

  @ViewChild('searchActivityChart')  private searchActivityRef!: ElementRef<HTMLDivElement>;
  @ViewChild('tokenConsumptionChart')private tokenConsumptionRef!: ElementRef<HTMLDivElement>;
  @ViewChild('skillsChart')          private skillsRef!: ElementRef<HTMLDivElement>;

  readonly company = signal<Company | null>(null);
  readonly loading = signal(true);

  private charts: echarts.ECharts[] = [];

  constructor() {
    effect(() => {
      const c = this.company();
      const loading = this.loading();

      if (!loading && c && isPlatformBrowser(this.platformId)) {
        queueMicrotask(() => {
          requestAnimationFrame(() => this.renderCharts());
        });
      }
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';

    this.companyService.getCompanyById(id).subscribe(c => {
      this.company.set(c ?? null);
      this.loading.set(false);
    });
  }

  ngOnDestroy(): void {
    this.disposeCharts();
  }

  renderCharts(): void {
    const c = this.company();

    if (
      !c ||
      !this.searchActivityRef?.nativeElement ||
      !this.tokenConsumptionRef?.nativeElement ||
      !this.skillsRef?.nativeElement
    ) {
      return;
    }

    this.disposeCharts();

    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const days   = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

    const searchChart = echarts.init(this.searchActivityRef.nativeElement);
    searchChart.setOption({
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#1e293b',
        textStyle: { color: '#fff', fontSize: 12 },
      },
      grid: { top: 20, right: 20, bottom: 30, left: 50 },
      xAxis: {
        type: 'category',
        data: months,
        axisLine: { lineStyle: { color: '#e5e7eb' } },
        axisTick: { show: false },
        axisLabel: { color: '#9ca3af', fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: '#f3f4f6' } },
        axisLabel: { color: '#9ca3af', fontSize: 11 },
      },
      series: [{
        type: 'line',
        data: c.searchActivity,
        smooth: true,
        symbol: 'none',
        lineStyle: { color: '#60a5fa', width: 2 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(96,165,250,0.25)' },
              { offset: 1, color: 'rgba(96,165,250,0.02)' },
            ],
          },
        },
      }],
    });

    this.charts.push(searchChart);

    const tokenChart = echarts.init(this.tokenConsumptionRef.nativeElement);
    tokenChart.setOption({
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#1e293b',
        textStyle: { color: '#fff', fontSize: 12 },
        formatter: (params: any) =>
          `${(params[0].value / 1000).toFixed(0)}k`,
      },
      grid: { top: 20, right: 20, bottom: 30, left: 60 },
      xAxis: {
        type: 'category',
        data: days,
        axisLine: { lineStyle: { color: '#e5e7eb' } },
        axisTick: { show: false },
        axisLabel: { color: '#9ca3af', fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: '#9ca3af',
          fontSize: 11,
          formatter: (v: number) => `${(v / 1000).toFixed(0)}k`,
        },
        splitLine: { lineStyle: { color: '#f3f4f6' } },
      },
      series: [{
        type: 'bar',
        data: c.tokenConsumption,
        barMaxWidth: 48,
        itemStyle: { color: '#1e293b', borderRadius: [4, 4, 0, 0] },
      }],
    });

    this.charts.push(tokenChart);

    const skillsReversed = [...c.mostSearchedSkills].reverse();

    const skillsChart = echarts.init(this.skillsRef.nativeElement);
    skillsChart.setOption({
      tooltip: { trigger: 'axis', axisPointer: { type: 'none' } },
      grid: { top: 10, right: 40, bottom: 30, left: 90 },
      xAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: '#f3f4f6' } },
        axisLabel: { color: '#9ca3af', fontSize: 11 },
      },
      yAxis: {
        type: 'category',
        data: skillsReversed.map(s => s.skill),
        axisLabel: { color: '#374151', fontSize: 12 },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [{
        type: 'bar',
        data: skillsReversed.map(s => s.count),
        barMaxWidth: 16,
        itemStyle: { color: '#3b82f6', borderRadius: [0, 4, 4, 0] },
      }],
    });

    this.charts.push(skillsChart);
  }

  private disposeCharts(): void {
    this.charts.forEach(c => c.dispose());
    this.charts = [];
  }

  goBack(): void {
    this.router.navigate(['/dashboard/companies']);
  }

  getTokenPercent(company: Company): number {
    return Math.round((company.tokensUsed / company.tokensLimit) * 100);
  }

  banCompany(): void {
    const c = this.company();
    if (!c) return;

    const newStatus: CompanyStatus =
      c.status === 'Banned' ? 'Active' : 'Banned';

    this.companyService.updateStatus(c.id, newStatus).subscribe(() => {
      this.company.update(co => (co ? { ...co, status: newStatus } : co));
    });
  }

  upgradePlan(): void {
    console.log('Upgrade plan for:', this.company()?.name);
  }
}
