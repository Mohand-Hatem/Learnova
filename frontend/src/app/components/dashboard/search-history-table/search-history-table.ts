import { Component, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  LucideAngularModule,
  Search,
  Calendar,
  ChevronDown,
  ChevronUp,
  Users,
  ExternalLink,
  Bot,
  Sparkles,
  FileText,
} from 'lucide-angular';

@Component({
  selector: 'app-search-history-table',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './search-history-table.html',
  host: { class: 'block w-full' },
})
export class SearchHistoryTable {
  readonly history = input.required<any[]>();
  readonly showCompany = input<boolean>(false);

  readonly expandedRows = signal<Set<string>>(new Set());

  readonly icons = {
    Search,
    Calendar,
    ChevronDown,
    ChevronUp,
    Users,
    ExternalLink,
    Bot,
    Sparkles,
    FileText,
  };

  toggleRow(id: string): void {
    const current = new Set(this.expandedRows());
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    this.expandedRows.set(current);
  }

  isExpanded(id: string): boolean {
    return this.expandedRows().has(id);
  }

  getCompanyName(item: any): string {
    const rawName = item?.company?.name;
    if (typeof rawName === 'string') return rawName;
    return rawName?.en || rawName?.ar || 'Unknown Company';
  }
}
