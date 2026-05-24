import { Component, input } from '@angular/core';
import type { AiHealthItem } from '../../dashboard.models';
import { AI_HEALTH } from '../../dashboard.models';

@Component({
  selector: 'app-ai-health-panel',
  standalone: true,
  templateUrl: './ai-health-panel.html',
  styleUrl: './ai-health-panel.scss',
})
export class AiHealthPanel {
  readonly items = input<AiHealthItem[]>(AI_HEALTH);
  readonly isLive = input(false);

  barColor(value: number): string {
    if (value >= 99) return '#22c55e';
    if (value >= 95) return '#84cc16';
    if (value >= 90) return '#eab308';
    return '#f97316';
  }
}
