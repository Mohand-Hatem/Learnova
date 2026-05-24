import { Component, computed, input } from '@angular/core';
import { NgApexchartsModule } from 'ng-apexcharts';
import type { ApexOptions } from 'ng-apexcharts';
import type { PlatformActivity } from '../../dashboard.models';
import { PLATFORM_ACTIVITY } from '../../dashboard.models';

@Component({
  selector: 'app-platform-activity-chart',
  standalone: true,
  imports: [NgApexchartsModule],
  templateUrl: './platform-activity-chart.html',
  styleUrl: './platform-activity-chart.scss',
})
export class PlatformActivityChart {
  readonly activity = input<PlatformActivity>(PLATFORM_ACTIVITY);
  readonly isLive = input(false);

  readonly chartOptions = computed((): ApexOptions => {
    const data = this.activity();
    const maxVal = Math.max(...data.activeUsers, ...data.aiAnalyses, 10);

    return {
      series: [
        { name: 'Active users', data: data.activeUsers },
        { name: 'AI analyses', data: data.aiAnalyses },
      ],
      chart: {
        type: 'area',
        height: 320,
        toolbar: { show: false },
        background: 'transparent',
        fontFamily: 'Inter, sans-serif',
      },
      colors: ['#8b5cf6', '#22d3ee'],
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: 2 },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.45,
          opacityTo: 0.05,
          stops: [0, 90, 100],
        },
      },
      xaxis: {
        categories: data.labels,
        labels: { style: { colors: '#64748b', fontSize: '11px' } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        max: Math.ceil(maxVal * 1.15),
        labels: { style: { colors: '#64748b', fontSize: '11px' } },
      },
      grid: {
        borderColor: '#1e2430',
        strokeDashArray: 4,
      },
      legend: {
        position: 'top',
        horizontalAlign: 'left',
        labels: { colors: '#94a3b8' },
        markers: { shape: 'circle' },
      },
      tooltip: {
        theme: 'dark',
      },
    };
  });
}
