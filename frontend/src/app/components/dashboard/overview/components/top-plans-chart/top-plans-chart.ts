import { Component, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxEchartsDirective } from 'ngx-echarts';
import type { EChartsOption } from 'echarts';
import type { TopPlan } from '../../dashboard.models';
import { ThemeService } from '../../../../../services/theme.service';

@Component({
  selector: 'app-top-plans-chart',
  standalone: true,
  imports: [CommonModule, NgxEchartsDirective],
  templateUrl: './top-plans-chart.html',
  host: { class: 'block h-full' },
})
export class TopPlansChart {
  readonly plans = input.required<TopPlan[]>();
  readonly total = input<number>(0);

  private readonly themeService = inject(ThemeService);
  readonly hasData = computed(() => this.plans().length > 0);

  readonly chartOptions = computed((): EChartsOption => {
    const dark      = this.themeService.isDark();
    const plans     = this.plans();
    const total     = this.total();
    const valueFg   = dark ? '#f1f5f9' : '#0f172a';
    const subFg     = dark ? '#64748b' : '#94a3b8';
    const tooltipBg = dark ? '#1e293b' : '#ffffff';
    const tooltipBd = dark ? '#334155' : '#e2e8f0';
    const tooltipFg = dark ? '#e2e8f0' : '#1e293b';

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: tooltipBg,
        borderColor: tooltipBd,
        borderWidth: 1,
        textStyle: { color: tooltipFg, fontSize: 12 },
        formatter: '{b}: <b>{d}%</b>',
      },
      series: [
        {
          type: 'pie',
          radius: ['52%', '76%'],
          center: ['50%', '50%'],
          avoidLabelOverlap: false,
          label: {
            show: true,
            position: 'center',
            formatter: () => `{total|${total.toLocaleString()}}\n{sub|Total}`,
            rich: {
              total: {
                fontSize: 28,
                fontWeight: 700,
                color: valueFg,
                lineHeight: 38,
                fontFamily: 'Inter, sans-serif',
              },
              sub: {
                fontSize: 12,
                color: subFg,
                lineHeight: 20,
                fontFamily: 'Inter, sans-serif',
              },
            },
          },
          emphasis: {
            label: { show: true },
            itemStyle: { shadowBlur: 16, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.25)' },
          },
          labelLine: { show: false },
          data: plans.map((p) => ({
            value: p.percentage,
            name: p.name,
            itemStyle: { color: p.color, borderWidth: 0 },
          })),
        },
      ],
    };
  });
}
