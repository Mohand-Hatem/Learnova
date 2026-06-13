import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  LucideAngularModule,
  ChevronLeft,
  ShieldCheck,
  Mail,
  Calendar,
  FileText,
  FileX,
  ExternalLink,
  CreditCard,
  Zap,
  CheckCircle,
  AlertTriangle,
  Clock,
  Ban,
} from 'lucide-angular';
import { AdminService } from '../../../../services/admin.service';

@Component({
  selector: 'app-admin-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './admin-detail.component.html',
})
export class AdminDetailComponent implements OnInit {
  private readonly route        = inject(ActivatedRoute);
  private readonly router       = inject(Router);
  private readonly adminService = inject(AdminService);

  readonly admin   = signal<any>(null);
  readonly loading = signal(true);
  readonly error   = signal('');
  readonly imgError = signal(false);

  readonly icons = {
    ChevronLeft, ShieldCheck, Mail, Calendar, FileText, FileX,
    ExternalLink, CreditCard, Zap, CheckCircle, AlertTriangle, Clock, Ban,
  };

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.adminService.getUserById(id).subscribe({
      next: (res: any) => {
        this.admin.set(res?.data ?? res);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load admin details.');
        this.loading.set(false);
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard/admins']);
  }

  getName(user: any): string {
    const n = user?.name;
    if (!n) return '—';
    if (typeof n === 'string') return n;
    return n.en || n.ar || '—';
  }

  getInitials(user: any): string {
    return this.getName(user)
      .split(' ')
      .slice(0, 2)
      .map((w: string) => w[0] ?? '')
      .join('')
      .toUpperCase() || '?';
  }

  getTokenPct(user: any): number {
    if (!user?.maxToken) return 0;
    return Math.min(100, Math.round((user.tokenUsage / user.maxToken) * 100));
  }

  formatBytes(bytes: number): string {
    if (!bytes) return '—';
    if (bytes < 1024)        return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  atsColor(score: number): string {
    if (score >= 90) return 'text-emerald-600 dark:text-emerald-400';
    if (score >= 75) return 'text-sky-600    dark:text-sky-400';
    if (score >= 60) return 'text-amber-600  dark:text-amber-400';
    return 'text-rose-600 dark:text-rose-400';
  }

  atsBg(score: number): string {
    if (score >= 90) return 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300';
    if (score >= 75) return 'bg-sky-50     dark:bg-sky-500/15     text-sky-700     dark:text-sky-300';
    if (score >= 60) return 'bg-amber-50   dark:bg-amber-500/15   text-amber-700   dark:text-amber-300';
    return 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300';
  }

  statusBadge(status: string): string {
    const map: Record<string, string> = {
      analyzed:   'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
      processing: 'bg-amber-50   dark:bg-amber-500/15   text-amber-700   dark:text-amber-300',
      uploaded:   'bg-sky-50     dark:bg-sky-500/15     text-sky-700     dark:text-sky-300',
      failed:     'bg-rose-50    dark:bg-rose-500/15    text-rose-700    dark:text-rose-300',
    };
    return map[status] ?? map['uploaded'];
  }

  statusIcon(status: string) {
    return status === 'analyzed'   ? this.icons.CheckCircle
         : status === 'failed'     ? this.icons.AlertTriangle
         : status === 'processing' ? this.icons.Clock
         : this.icons.FileText;
  }

  planBadge(plan: string): string {
    if (plan === 'Enterprise') return 'bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300';
    if (plan === 'Pro')        return 'bg-violet-50 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300';
    return 'bg-slate-100 dark:bg-slate-700/40 text-slate-600 dark:text-slate-300';
  }
}
