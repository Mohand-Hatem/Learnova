import { Component, computed, input } from '@angular/core';
import { NgApexchartsModule } from 'ng-apexcharts';
import type { ApexOptions } from 'ng-apexcharts';
import type { SkillItem } from '../../dashboard.models';
import { TOP_SKILLS } from '../../dashboard.models';

@Component({
  selector: 'app-skills-bar-chart',
  standalone: true,
  imports: [NgApexchartsModule],
  templateUrl: './skills-bar-chart.html',
  styleUrl: './skills-bar-chart.scss',
})
export class SkillsBarChart {
  readonly skills = input<SkillItem[]>(TOP_SKILLS);
  readonly isLive = input(false);

  readonly chartOptions = computed((): ApexOptions => {
    const items = this.skills();

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
        labels: { style: { colors: '#64748b', fontSize: '11px' } },
        axisBorder: { show: false },
      },
      yaxis: {
        labels: { style: { colors: '#94a3b8', fontSize: '12px' } },
      },
      grid: {
        borderColor: '#1e2430',
        xaxis: { lines: { show: true } },
        yaxis: { lines: { show: false } },
      },
      tooltip: { theme: 'dark' },
    };
  });
}
