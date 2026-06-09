import { Component, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxEchartsDirective } from 'ngx-echarts';
import type { EChartsOption } from 'echarts';
import type { SkillItem } from '../../dashboard.models';
import { TOP_SKILLS } from '../../dashboard.models';
import { ThemeService } from '../../../../../services/theme.service';

@Component({
  selector: 'app-skills-bar-chart',
  standalone: true,
  imports: [CommonModule, NgxEchartsDirective],
  templateUrl: './skills-bar-chart.html',
  styleUrls: ['./skills-bar-chart.scss'],
})
export class SkillsBarChart {
  readonly skills = input<SkillItem[]>(TOP_SKILLS);
  readonly isLive = input(false);
  private readonly themeService = inject(ThemeService);

  readonly chartOptions = computed((): EChartsOption => {
    const items = this.skills();
    const dark = this.themeService.isDark();
    const textColor = dark ? '#94a3b8' : '#475569';
    const gridColor = dark ? '#1e2430' : '#e2e8f0';
    const tooltipBackgroundColor = dark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)';
    const tooltipBorderColor = dark ? '#334155' : '#e2e8f0';

    return {
      color: ['#8b5cf6'],
      backgroundColor: 'transparent',
      textStyle: {
        fontFamily: 'Inter, sans-serif',
        color: textColor,
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
          type: 'shadow',
        },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '5%',
        containLabel: true,
        borderColor: gridColor,
      },
      xAxis: {
        type: 'value',
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
      yAxis: {
        type: 'category',
        data: items.map((s) => s.skill),
        axisLine: {
          show: false,
        },
        axisTick: {
          show: false,
        },
        axisLabel: {
          color: textColor,
          fontSize: 12,
        },
        splitLine: {
          show: false,
        },
      },
      series: [
        {
          name: 'Detections',
          data: items.map((s) => s.count),
          type: 'bar',
          barWidth: '55%',
          itemStyle: {
            borderRadius: [0, 6, 6, 0],
          },
          label: {
            show: false,
          },
        },
      ],
    };
  });
}
