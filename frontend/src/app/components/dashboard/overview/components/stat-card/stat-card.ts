import { Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxEchartsDirective } from 'ngx-echarts';
import {
  LucideAngularModule,
  Users,
  Building,
  FileText,
  Brain,
  DollarSign,
  ArrowUp,
  ArrowDown,
} from 'lucide-angular';
import type { EChartsOption } from 'echarts';
import type { StatCard } from '../../dashboard.models';

const SPARKLINE_COLOR = '#a78bfa';
const SPARKLINE_GRADIENT_TO = '#6366f1';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule, NgxEchartsDirective, LucideAngularModule],
  templateUrl: './stat-card.html',
  styleUrls: ['./stat-card.scss'],
})
export class StatCardComponent {
  readonly stat = input.required<StatCard>();

  readonly icons = { ArrowUp, ArrowDown, Users, Building, FileText, Brain, DollarSign };

  readonly iconMap: Record<string, any> = {
    people: Users,
    building: Building,
    'file-text': FileText,
    brain: Brain,
    'dollar-sign': DollarSign,
    'people-fill': Users,
  };

  readonly chartOptions = computed((): EChartsOption => {
    const s = this.stat();
    return {
      color: [SPARKLINE_COLOR],
      backgroundColor: 'transparent',
      grid: {
        left: 0,
        right: 0,
        top: 5,
        bottom: 0,
        containLabel: false,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { show: false },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { show: false },
        splitLine: { show: false },
      },
      series: [
        {
          data: s.sparkline,
          type: 'line',
          smooth: true,
          symbolSize: 0,
          lineStyle: {
            width: 2,
            color: SPARKLINE_COLOR,
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: `rgba(167, 139, 250, 0.5)` },
                { offset: 1, color: `rgba(99, 102, 241, 0)` },
              ],
            },
          },
        },
      ],
      tooltip: { show: false },
    };
  });
}
