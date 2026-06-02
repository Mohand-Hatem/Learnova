import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { RecentCv } from '../../dashboard.models';

@Component({
  selector: 'app-recent-cvs-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './recent-cvs-table.html',
  styleUrls: ['./recent-cvs-table.scss'],
})
export class RecentCvsTable {
  readonly cvs = input.required<RecentCv[]>();
  readonly isLive = input(false);

  statusClass(status: RecentCv['status']): string {
    switch (status) {
      case 'Shortlisted':
        return 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/25';
      case 'Reviewing':
        return 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/25';
      default:
        return 'bg-slate-700/70 text-slate-300 ring-1 ring-slate-500/30';
    }
  }
}
