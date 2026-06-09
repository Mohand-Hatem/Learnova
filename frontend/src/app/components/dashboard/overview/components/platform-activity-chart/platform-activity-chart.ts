import { Component, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxEchartsDirective } from 'ngx-echarts';
import type { EChartsOption } from 'echarts';
import type { PlatformActivity } from '../../dashboard.models';
import { PLATFORM_ACTIVITY } from '../../dashboard.models';
import { ThemeService } from '../../../../../services/theme.service';

@Component({
  selector: 'app-platform-activity-chart',
  standalone: true,
  imports: [CommonModule, NgxEchartsDirective],
  templateUrl: './platform-activity-chart.html',
  styleUrls: ['./platform-activity-chart.scss'],
})
export class PlatformActivityChart {
  readonly activity = input<PlatformActivity>(PLATFORM_ACTIVITY);
  readonly isLive = input(false);
  private readonly themeService = inject(ThemeService);

  readonly chartOptions = computed((): EChartsOption => {
    const data = this.activity();
    const maxVal = Math.max(...data.activeUsers, ...data.aiAnalyses, 10);
    const dark = this.themeService.isDark();
    const textColor = dark ? '#94a3b8' : '#475569';
    const gridColor = dark ? '#1e2430' : '#e2e8f0';
    const backgroundColor = dark ? '#0f172a' : '#ffffff';
    const tooltipBackgroundColor = dark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)';
    const tooltipBorderColor = dark ? '#334155' : '#e2e8f0';

    return {
      color: ['#8b5cf6', '#22d3ee'],
      backgroundColor: 'transparent',
      textStyle: {
        fontFamily: 'Inter, sans-serif',
        color: textColor,
      },
      legend: {
        type: 'plain',
        top: 0,
        left: 0,
        orient: 'horizontal',
        textStyle: {
          color: textColor,
        },
        itemGap: 20,
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: tooltipBackgroundColor,
        borderColor: tooltipBorderColor,
        borderWidth: 1,
        textStyle: {
          color: dark ? '#e2e8f0' : '#1e293b',
        },
        axisPointer: {
          type: 'cross',
          lineStyle: {
            color: dark ? '#475569' : '#cbd5e1',
          },
        },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '15%',
        containLabel: true,
        borderColor: gridColor,
      },
      xAxis: {
        type: 'category',
        data: data.labels,
        boundaryGap: false,
        axisLine: {
          show: false,
        },
        axisTick: {
          show: false,
        },
        axisLabel: {
          color: textColor,
          fontSize: 11,
        },
        splitLine: {
          show: false,
        },
      },
      yAxis: {
        type: 'value',
        max: Math.ceil(maxVal * 1.15),
        axisLine: {
          show: false,
        },
        axisTick: {
          show: false,
        },
        axisLabel: {
          color: textColor,
          fontSize: 11,
        },
        splitLine: {
          lineStyle: {
            color: gridColor,
            type: 'dashed',
          },
        },
      },
      series: [
        {
          name: 'Active users',
          data: data.activeUsers,
          type: 'line',
          smooth: true,
          symbolSize: 5,
          lineStyle: {
            width: 2,
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(139, 92, 246, 0.45)' },
                { offset: 1, color: 'rgba(139, 92, 246, 0.05)' },
              ],
            },
          },
        },
        {
          name: 'AI analyses',
          data: data.aiAnalyses,
          type: 'line',
          smooth: true,
          symbolSize: 5,
          lineStyle: {
            width: 2,
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(34, 211, 238, 0.45)' },
                { offset: 1, color: 'rgba(34, 211, 238, 0.05)' },
              ],
            },
          },
        },
      ],
    };
  });
}
