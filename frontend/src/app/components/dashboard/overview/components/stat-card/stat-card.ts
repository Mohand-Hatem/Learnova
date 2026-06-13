import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
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

interface SparkBar { x: number; y: number; w: number; h: number }

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './stat-card.html',
  host: { class: 'block h-full' },
})
export class StatCardComponent {
  readonly stat = input.required<StatCard>();

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

  sparklineBars(s: StatCard): SparkBar[] {
    const values = s.sparkline;
    if (!values?.length) return [];
    const totalW = 52;
    const totalH = 24;
    const n      = values.length;
    const barW   = Math.max(2, totalW / n - 1.5);
    const step   = totalW / n;
    const max    = Math.max(...values, 1);
    return values.map((v, i) => {
      const h = Math.max(2, (v / max) * totalH);
      return { x: i * step, y: totalH - h, w: barW, h };
    });
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
}
