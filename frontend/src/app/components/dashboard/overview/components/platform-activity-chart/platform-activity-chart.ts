import { Component, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxEchartsDirective } from 'ngx-echarts';
import type { EChartsOption } from 'echarts';
import type { PlatformActivity } from '../../dashboard.models';
import { ThemeService } from '../../../../../services/theme.service';

@Component({
  selector: 'app-platform-activity-chart',
  standalone: true,
  imports: [CommonModule, NgxEchartsDirective],
  templateUrl: './platform-activity-chart.html',
  styleUrls: ['./platform-activity-chart.scss'],
})
export class PlatformActivityChart {
  readonly activity = input.required<PlatformActivity>();
  private readonly themeService = inject(ThemeService);
  readonly hasData = computed(() => {
    const data = this.activity();
    return data.labels.length > 0 && (data.activeUsers.length > 0 || data.aiAnalyses.length > 0);
  });

  readonly chartOptions = computed((): EChartsOption => {
    const data = this.activity();
    const maxVal = Math.max(10, ...data.activeUsers, ...data.aiAnalyses);
    const dark = this.themeService.isDark();

    const textColor             = dark ? '#94a3b8' : '#64748b';
    const gridColor             = dark ? '#1e2d45' : '#e2e8f0';
    const tooltipBackgroundColor = dark ? '#131e30' : '#ffffff';
    const tooltipBorderColor    = dark ? '#1e2d45' : '#e2e8f0';

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
                { offset: 0, color: dark ? 'rgba(139, 92, 246, 0.45)' : 'rgba(99, 102, 241, 0.18)' },
                { offset: 1, color: 'rgba(139, 92, 246, 0.02)' },
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
                { offset: 0, color: dark ? 'rgba(34, 211, 238, 0.45)' : 'rgba(6, 182, 212, 0.18)' },
                { offset: 1, color: 'rgba(34, 211, 238, 0.02)' },
              ],
            },
          },
        },
      ],
    };
  });
}
