import { Component, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxEchartsDirective } from 'ngx-echarts';
import type { EChartsOption } from 'echarts';
import {
  LucideAngularModule,
  Users,
  Building2,
  FileUp,
  Target,
  Zap,
  Activity,
  Clock,
  ShieldCheck,
  Cpu,
  type LucideIconData,
} from 'lucide-angular';
import type { StatCard } from '../../dashboard.models';
import { ThemeService } from '../../../../../services/theme.service';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, NgxEchartsDirective],
  templateUrl: './stat-card.html',
  host: { class: 'block h-full' },
})
export class StatCardComponent {
  readonly stat = input.required<StatCard>();
  private readonly themeService = inject(ThemeService);

  readonly iconMap: Record<string, LucideIconData> = {
    /* overview */
    people:        Users,
    building:      Building2,
    'file-text':   FileUp,
    brain:         Target,
    'dollar-sign': Zap,
    'people-fill': Users,
    /* ai-analysis */
    activity:      Activity,
    clock:         Clock,
    shield:        ShieldCheck,
    cpu:           Cpu,
    zap:           Zap,
  };

  /** Color classes for the icon badge by card color token */
  readonly colorMap: Record<string, { bg: string; text: string }> = {
    indigo:  { bg: 'bg-indigo-50  dark:bg-indigo-500/15',  text: 'text-indigo-600  dark:text-indigo-400'  },
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-500/15', text: 'text-emerald-600 dark:text-emerald-400' },
    cyan:    { bg: 'bg-cyan-50    dark:bg-cyan-500/15',    text: 'text-cyan-600    dark:text-cyan-400'    },
    violet:  { bg: 'bg-violet-50  dark:bg-violet-500/15',  text: 'text-violet-600  dark:text-violet-400'  },
    amber:   { bg: 'bg-amber-50   dark:bg-amber-500/15',   text: 'text-amber-600   dark:text-amber-400'   },
  };

  private fallbackSparkline(s: StatCard): number[] {
    const seed = (s.title ?? '')
      .split('')
      .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    return Array.from({ length: 12 }, (_, index) => {
      const wave = Math.sin((seed + index * 11) / 10) * 6;
      const trend = s.trendUp ? index * 0.9 : (11 - index) * 0.65;
      return Math.max(10, Math.round(20 + wave + trend));
    });
  }

  private sparklineValues(s: StatCard): number[] {
    return s.sparkline?.length ? s.sparkline : this.fallbackSparkline(s);
  }

  iconClasses(s: StatCard): string {
    const color = (s as any).color ?? 'indigo';
    const map   = this.colorMap[color] ?? this.colorMap['indigo'];
    return `${map.bg} ${map.text}`;
  }

  barFill(s: StatCard): string {
    const color = (s as any).color ?? 'indigo';
    const fills: Record<string, string> = {
      indigo:  '#818cf8',
      emerald: '#34d399',
      cyan:    '#22d3ee',
      violet:  '#a78bfa',
      amber:   '#fbbf24',
    };
    return fills[color] ?? fills['indigo'];
  }

  glowColor(s: StatCard): string {
    const color = (s as any).color ?? 'indigo';
    const glows: Record<string, string> = {
      indigo:  'rgba(99, 102, 241, 0.24)',
      emerald: 'rgba(16, 185, 129, 0.22)',
      cyan:    'rgba(6, 182, 212, 0.22)',
      violet:  'rgba(139, 92, 246, 0.22)',
      amber:   'rgba(245, 158, 11, 0.22)',
    };
    return glows[color] ?? glows['indigo'];
  }

  private baseChartStyle(s: StatCard) {
    const color = this.barFill(s);
    const dark = this.themeService.isDark();
    return {
      color,
      axisColor: dark ? '#334155' : '#e2e8f0',
      splitColor: dark ? 'rgba(51,65,85,0.45)' : 'rgba(226,232,240,0.8)',
    };
  }

  miniChartOptions = computed((): EChartsOption => {
    const s = this.stat();
    const values = this.sparklineValues(s);
    const chartType = s.miniChartType ?? 'line';
    const { color, splitColor } = this.baseChartStyle(s);
    const latest = values[values.length - 1] ?? 0;
    const previous = values[Math.max(values.length - 2, 0)] ?? latest;
    const ratio = previous > 0 ? Math.min(95, Math.max(5, Math.round((latest / previous) * 45))) : 50;

    if (chartType === 'pie') {
      return {
        animationDuration: 500,
        color: [color, 'rgba(148,163,184,0.22)'],
        series: [
          {
            type: 'pie',
            radius: ['58%', '78%'],
            center: ['50%', '52%'],
            silent: true,
            label: { show: false },
            labelLine: { show: false },
            data: [
              { value: ratio, name: 'value' },
              { value: 100 - ratio, name: 'rest' },
            ],
          },
        ],
      };
    }

    if (chartType === 'bar') {
      return {
        animationDuration: 500,
        grid: { left: 0, right: 0, top: 4, bottom: 2, containLabel: false },
        xAxis: { type: 'category', data: values.map((_, i) => i), show: false },
        yAxis: { type: 'value', show: false, splitLine: { show: false } },
        series: [
          {
            type: 'bar',
            data: values,
            silent: true,
            itemStyle: {
              color,
              borderRadius: [2, 2, 0, 0],
            },
            barWidth: '48%',
          },
        ],
      };
    }

    if (chartType === 'scatter') {
      return {
        animationDuration: 500,
        grid: { left: 0, right: 0, top: 2, bottom: 2, containLabel: false },
        xAxis: { type: 'value', show: false, min: 0, max: values.length - 1 },
        yAxis: { type: 'value', show: false, splitLine: { lineStyle: { color: splitColor } } },
        series: [
          {
            type: 'scatter',
            data: values.map((value, i) => [i, value]),
            silent: true,
            symbolSize: (val: number[]) => {
              const v = Number(val[1]) || 0;
              return Math.max(5, Math.min(9, 5 + v / 25));
            },
            itemStyle: {
              color,
              opacity: 0.95,
            },
          },
        ],
      };
    }

    return {
      animationDuration: 500,
      grid: { left: 0, right: 0, top: 2, bottom: 2, containLabel: false },
      xAxis: { type: 'category', data: values.map((_, i) => i), show: false, boundaryGap: false },
      yAxis: { type: 'value', show: false, splitLine: { show: false } },
      series: [
        {
          type: 'line',
          data: values,
          silent: true,
          smooth: true,
          symbol: 'none',
          lineStyle: { color, width: 2.2 },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: color + '66' },
                { offset: 1, color: color + '08' },
              ],
            },
          },
        },
      ],
    };
  });
}
