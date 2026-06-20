import { Component, inject, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../../services/theme.service';
import { NgxEchartsModule, provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts';
import { StatCardComponent } from '../overview/components/stat-card/stat-card';
import { AiMonitoringService } from '../../../services/ai-monitoring.service';

@Component({
  selector: 'app-ai-analysis',
  standalone: true,
  imports: [CommonModule, NgxEchartsModule, StatCardComponent],
  providers: [provideEchartsCore({ echarts })],
  templateUrl: './ai-analysis.component.html',
})
export class AiAnalysisComponent implements OnInit {
  private readonly themeService = inject(ThemeService);
  private readonly aiService = inject(AiMonitoringService);

  readonly statCards = this.aiService.statCards;
  readonly companies = this.aiService.topUsers;
  readonly loading = this.aiService.loading;
  readonly loadError = this.aiService.loadError;
  readonly hasStats = this.aiService.hasStats;
  readonly hasTopUsers = this.aiService.hasTopUsers;
  readonly hasMonthly = this.aiService.hasMonthly;
  readonly hasTokenBreakdown = this.aiService.hasTokenBreakdown;

  readonly tokenBreakdownChartOption = computed(() => {
    const dark = this.themeService.isDark();
    const textColor = dark ? '#cbd5e1' : '#475569';
    const data = this.aiService.tokenBreakdown();

    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item' },
      legend: {
        bottom: 0,
        textStyle: { color: textColor, fontSize: 11 },
      },
      series: [
        {
          type: 'pie',
          radius: ['45%', '70%'],
          center: ['50%', '45%'],
          label: { show: false },
          data: [
            { value: data.embedding, name: 'Embedding', itemStyle: { color: '#6366f1' } },
            { value: data.prompt, name: 'Prompt', itemStyle: { color: '#06b6d4' } },
            { value: data.completion, name: 'Completion', itemStyle: { color: '#22c55e' } },
          ],
        },
      ],
    };
  });

  readonly tokenChartOption = computed(() => {
    const dark = this.themeService.isDark();
    const data = this.aiService.monthly();

    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      legend: {
        top: 0,
        textStyle: { color: dark ? '#cbd5e1' : '#475569' },
      },
      xAxis: {
        type: 'category',
        data: data.labels,
        axisLabel: { color: dark ? '#94a3b8' : '#475569' },
        axisLine: { lineStyle: { color: dark ? '#1f2a44' : '#e6e9ef' } },
      },
      yAxis: [
        {
          type: 'value',
          name: 'Calls',
          axisLabel: { color: dark ? '#94a3b8' : '#475569' },
          splitLine: { lineStyle: { color: dark ? '#1f2a44' : '#e6e9ef' } },
        },
        {
          type: 'value',
          name: 'Tokens',
          axisLabel: {
            color: dark ? '#94a3b8' : '#475569',
            formatter: (v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)),
          },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: 'AI Calls',
          type: 'line',
          smooth: true,
          data: data.aiCalls,
          itemStyle: { color: '#6366f1' },
          lineStyle: { width: 2.5, color: '#6366f1' },
        },
        {
          name: 'Token Usage',
          type: 'bar',
          yAxisIndex: 1,
          barMaxWidth: 36,
          data: data.totalTokens,
          itemStyle: { color: '#06b6d4', borderRadius: [6, 6, 0, 0] },
        },
      ],
    };
  });

  ngOnInit(): void {
    this.aiService.load();
  }
}