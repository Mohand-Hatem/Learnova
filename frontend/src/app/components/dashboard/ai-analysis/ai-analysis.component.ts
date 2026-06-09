// import { Component } from '@angular/core';

// @Component({
//   selector: 'app-ai-analysis',
//   standalone: true,
//   templateUrl: './ai-analysis.component.html',
// })
// export class AiAnalysisComponent {}
import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../../services/theme.service';
import { NgxEchartsModule, provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts';
// import { NgxEchartsModule, provideEcharts } from 'ngx-echarts';

@Component({
  selector: 'app-ai-analysis',
  standalone: true,
  imports: [CommonModule, NgxEchartsModule],
  providers: [provideEchartsCore({ echarts })],
  // providers: [provideEcharts()],
  templateUrl: './ai-analysis.component.html',
})
export class AiAnalysisComponent implements OnInit {
  themeService = inject(ThemeService);

  // ========== STAT CARDS ==========
  statCards = signal([
    {
      title: 'AI Calls',
      value: '2.4M',
      change: '+24.6%',
      positive: true,
      icon: '✦',
      color: 'indigo',
    },
    {
      title: 'Token Spend',
      value: '$42.8K',
      change: '-3.2%',
      positive: false,
      icon: '⚡',
      color: 'cyan',
    },
    {
      title: 'Avg Response Time',
      value: '1.2s',
      change: '+8.1%',
      positive: false,
      icon: '⏱',
      color: 'violet',
    },
    {
      title: 'Success Rate',
      value: '99.3%',
      change: '+0.4%',
      positive: true,
      icon: '✔',
      color: 'green',
    },
  ]);

  // ========== SKILLS CHART ==========
  skillsChartOption = computed(() => ({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: ['TypeScript', 'React', 'Python', 'Kubernetes', 'Figma', 'AWS'],
      axisLabel: { color: this.themeService.isDark() ? '#94a3b8' : '#475569' },
      axisLine: { lineStyle: { color: this.themeService.isDark() ? '#1f2a44' : '#e6e9ef' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: this.themeService.isDark() ? '#94a3b8' : '#475569' },
      splitLine: { lineStyle: { color: this.themeService.isDark() ? '#1f2a44' : '#e6e9ef' } },
    },
    series: [{
      data: [1320, 1100, 1050, 750, 690, 620],
      type: 'bar',
      barMaxWidth: 50,
      itemStyle: {
        color: '#4f46e5',
        borderRadius: [6, 6, 0, 0],
      },
    }],
  }));

  // ========== TOKEN USAGE CHART ==========
  tokenChartOption = computed(() => ({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      axisLabel: { color: this.themeService.isDark() ? '#94a3b8' : '#475569' },
      axisLine: { lineStyle: { color: this.themeService.isDark() ? '#1f2a44' : '#e6e9ef' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: this.themeService.isDark() ? '#94a3b8' : '#475569',
        formatter: (v: number) => `${v / 1000}k`,
      },
      splitLine: { lineStyle: { color: this.themeService.isDark() ? '#1f2a44' : '#e6e9ef' } },
    },
    series: [{
      data: [750000, 820000, 980000, 940000, 1150000, 700000, 650000],
      type: 'bar',
      barMaxWidth: 50,
      itemStyle: {
        color: '#4f46e5',
        borderRadius: [6, 6, 0, 0],
      },
    }],
  }));

  // ========== COMPANIES LEADERBOARD ==========
  companies = signal([
    { rank: 1, name: 'Nordstream Labs', searches: 1284, plan: 'Enterprise' },
    { rank: 2, name: 'Vela Aerospace', searches: 1108, plan: 'Enterprise' },
    { rank: 3, name: 'Quanta Health', searches: 942, plan: 'Enterprise' },
    { rank: 4, name: 'Helio Robotics', searches: 482, plan: 'Pro' },
    { rank: 5, name: 'Linea Bank', searches: 364, plan: 'Pro' },
    { rank: 6, name: 'Forge Studios', searches: 218, plan: 'Pro' },
  ]);

  ngOnInit() {}
}