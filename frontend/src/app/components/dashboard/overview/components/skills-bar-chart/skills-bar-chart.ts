import { Component, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgApexchartsModule } from 'ng-apexcharts';
import type { ApexOptions } from 'ng-apexcharts';
import type { SkillItem } from '../../dashboard.models';
import { TOP_SKILLS } from '../../dashboard.models';
import { ThemeService } from '../../../../../services/theme.service';

@Component({
  selector: 'app-skills-bar-chart',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  templateUrl: './skills-bar-chart.html',
  styleUrls: ['./skills-bar-chart.scss'],
})
export class SkillsBarChart {
  readonly skills = input<SkillItem[]>(TOP_SKILLS);
  readonly isLive = input(false);
  private readonly themeService = inject(ThemeService);

  readonly chartOptions = computed((): ApexOptions => {
    const items = this.skills();
    const dark = this.themeService.isDark();
    const labelColor = dark ? '#64748b' : '#475569';
    const yLabelColor = dark ? '#94a3b8' : '#334155';
    const gridColor = dark ? '#1e2430' : '#e2e8f0';

    return {
      series: [{ name: 'Detections', data: items.map((s) => s.count) }],
      chart: {
        type: 'bar',
        height: 320,
        toolbar: { show: false },
        background: 'transparent',
      },
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 6,
          barHeight: '55%',
        },
      },
      colors: ['#8b5cf6'],
      dataLabels: { enabled: false },
      xaxis: {
        categories: items.map((s) => s.skill),
        labels: { style: { colors: labelColor, fontSize: '11px' } },
        axisBorder: { show: false },
      },
      yaxis: {
        labels: { style: { colors: yLabelColor, fontSize: '12px' } },
      },
      grid: {
        borderColor: gridColor,
        xaxis: { lines: { show: true } },
        yaxis: { lines: { show: false } },
      },
      tooltip: { theme: dark ? 'dark' : 'light' },
    };
  });
}
