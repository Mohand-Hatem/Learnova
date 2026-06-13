import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { RecentCv } from '../../dashboard.models';

@Component({
  selector: 'app-recent-cvs-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './recent-cvs-table.html',
  host: { class: 'block h-full' },
})
export class RecentCvsTable {
  readonly cvs = input.required<RecentCv[]>();
  readonly isLive = input(false);
}
