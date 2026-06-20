import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, ExternalLink } from 'lucide-angular';
import type { AiHealthItem, TopCompany } from '../../dashboard.models';

@Component({
  selector: 'app-ai-health-panel',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './ai-health-panel.html',
  host: { class: 'block h-full' },
})
export class AiHealthPanel {
  readonly items = input<AiHealthItem[]>([]);
  readonly companies = input.required<TopCompany[]>();

  readonly icons = { ExternalLink };
}
