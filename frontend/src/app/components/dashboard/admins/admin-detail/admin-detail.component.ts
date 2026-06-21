import { Component, computed, inject, OnInit, signal } from '@angular/core';
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
  Star,
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
  readonly actionSeries = signal<Array<{ date: string; count: number }>>([]);
  readonly actionTimeline = signal<Array<{
    id: string;
    action: string;
    details: string;
    targetName: string;
    targetRole: string;
    createdAt: string;
  }>>([]);
  readonly actionBreakdown = signal<Array<{ action: string; count: number }>>([]);
  readonly actionLoading = signal(true);

  readonly icons = {
    ChevronLeft, ShieldCheck, Mail, Calendar, FileText, FileX,
    ExternalLink, CreditCard, Zap, CheckCircle, AlertTriangle, Clock, Ban, Star,
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

    this.adminService.getAdminActions(id).subscribe({
      next: (res: any) => {
        this.actionSeries.set(res?.data?.series ?? []);
        this.actionTimeline.set(res?.data?.actions ?? []);
        this.actionBreakdown.set(res?.data?.actionTypeBreakdown ?? []);
        this.actionLoading.set(false);
      },
      error: () => {
        this.actionSeries.set([]);
        this.actionTimeline.set([]);
        this.actionBreakdown.set([]);
        this.actionLoading.set(false);
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
    if (plan === 'Unlimited') return 'bg-amber-100 dark:bg-amber-500/25 text-amber-800 dark:text-amber-200';
    if (plan === 'Enterprise') return 'bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300';
    if (plan === 'Pro')        return 'bg-violet-50 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300';
    return 'bg-slate-100 dark:bg-slate-700/40 text-slate-600 dark:text-slate-300';
  }

  readonly actionBars = computed(() => {
    const points = this.actionSeries();
    const max = Math.max(...points.map((p) => p.count), 1);
    return points.map((point, index) => ({
      ...point,
      height: Math.max(6, Math.round((point.count / max) * 96)),
      label: this.shortDate(point.date),
      index,
    }));
  });

  readonly totalActions = computed(() =>
    this.actionSeries().reduce((sum, item) => sum + item.count, 0),
  );

  readonly mostFrequentAction = computed(() => this.actionBreakdown()[0]?.action ?? '—');

  prettyAction(action: string): string {
    return action
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  shortDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}
