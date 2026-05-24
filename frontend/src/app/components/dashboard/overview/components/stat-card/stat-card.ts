import { Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgApexchartsModule } from 'ng-apexcharts';
import type { ApexOptions } from 'ng-apexcharts';
import type { StatCard } from '../../dashboard.models';

const SPARKLINE_COLOR = '#a78bfa';
const SPARKLINE_GRADIENT_TO = '#6366f1';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  templateUrl: './stat-card.html',
  styleUrls: ['./stat-card.scss'],
})
export class StatCardComponent {
  readonly stat = input.required<StatCard>();

  readonly chartOptions = computed((): ApexOptions => {
    const s = this.stat();
    return {
      series: [{ data: s.sparkline }],
      chart: {
        type: 'area',
        sparkline: { enabled: true },
        animations: { enabled: false },
      },
      stroke: {
        curve: 'straight',
        width: 2,
        colors: [SPARKLINE_COLOR],
      },
      colors: [SPARKLINE_COLOR],
      fill: {
        type: 'gradient',
        gradient: {
          type: 'vertical',
          shadeIntensity: 0,
          opacityFrom: 0.45,
          opacityTo: 0,
          colorStops: [
            { offset: 0, color: SPARKLINE_COLOR, opacity: 0.5 },
            { offset: 100, color: SPARKLINE_GRADIENT_TO, opacity: 0 },
          ],
        },
      },
      tooltip: { enabled: false },
    };
  });
}
