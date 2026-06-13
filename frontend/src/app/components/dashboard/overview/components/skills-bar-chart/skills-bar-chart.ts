import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  LucideAngularModule,
  Code2,
  Cloud,
  Database,
  Cpu,
  Layers,
  type LucideIconData,
} from 'lucide-angular';
import type { SkillItem } from '../../dashboard.models';
import { TOP_SKILLS } from '../../dashboard.models';

@Component({
  selector: 'app-skills-bar-chart',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './skills-bar-chart.html',
  host: { class: 'block h-full' },
})
export class SkillsBarChart {
  readonly skills = input<SkillItem[]>(TOP_SKILLS);
  readonly isLive = input(false);

  readonly iconMap: Record<string, LucideIconData> = {
    code:     Code2,
    cloud:    Cloud,
    database: Database,
    cpu:      Cpu,
    layers:   Layers,
  };

  formatCount(n: number): string {
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return String(n);
  }
}
