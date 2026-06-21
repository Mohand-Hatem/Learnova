import {
  Component,
  computed,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import {
  LucideAngularModule,
  ShieldCheck,
  ShieldPlus,
  Search,
  RefreshCw,
  UserX,
  FileText,
  FileX,
  Eye,
  ChevronDown,
  Star,
  ChevronLeft,
  ChevronRight,
} from 'lucide-angular';
import { AdminService } from '../../../services/admin.service';
import { ToastrService } from 'ngx-toastr';
import { SessionNotificationsService } from '../../../services/session-notifications.service';
import { USERS_DIALOG_PANEL } from '../users/users-theme';
import { CreateAccountDialogData, CreateAccountPayload, CreateAdminDialogComponent } from './create-admin-dialog/create-admin-dialog.component';

@Component({
  selector: 'app-admins',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule, MatDialogModule],
  templateUrl: './admins.component.html',
})
export class AdminsComponent implements OnInit {
  Math = Math;
  private readonly adminService = inject(AdminService);
  private readonly router       = inject(Router);
  private readonly toastr       = inject(ToastrService);
  private readonly dialog       = inject(MatDialog);
  private readonly sessionNotifications = inject(SessionNotificationsService);

  readonly allUsers  = signal<any[]>([]);
  readonly loading   = signal(true);
  readonly error     = signal('');
  readonly search    = signal('');
  readonly planFilter = signal('');
  readonly hasCvFilter = signal('');
  readonly creatingAdmin = signal(false);
  readonly currentPage = signal(1);
  readonly pageSize = signal(10);

  readonly icons = {
    ShieldCheck, ShieldPlus, Search, RefreshCw, UserX, FileText, FileX, Eye,
    ChevronDown, Star, ChevronLeft, ChevronRight,
  };

  readonly admins = computed(() => {
    const q = this.search().trim().toLowerCase();
    const plan = this.planFilter();
    const hasCv = this.hasCvFilter();
    return this.allUsers()
      .filter((u) => u.role === 'admin')
      .filter((u) => {
        if (!q) return true;
        const name = this.getName(u).toLowerCase();
        return name.includes(q) || (u.email ?? '').toLowerCase().includes(q);
      })
      .filter((u) => {
        if (plan && u.plan !== plan) return false;
        if (hasCv === 'yes' && !this.hasCv(u)) return false;
        if (hasCv === 'no' && this.hasCv(u)) return false;
        return true;
      });
  });
  readonly paginatedAdmins = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.admins().slice(start, start + this.pageSize());
  });
  readonly totalPages = computed(() => Math.ceil(this.admins().length / this.pageSize()));
  readonly pageNumbers = computed(() =>
    Array.from({ length: this.totalPages() }, (_, i) => i + 1),
  );

  constructor() {
    effect(() => {
      this.search();
      this.planFilter();
      this.hasCvFilter();
      this.resetPagination();
    });
  }
  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.adminService.getAllUsers().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (res?.data ?? res?.users ?? []);
        this.allUsers.set(list);
        this.loading.set(false);
        if (this.currentPage() > this.totalPages()) this.resetPagination();
      },
      error: () => {
        this.error.set('Failed to load admins. Please try again.');
        this.loading.set(false);
      },
    });
  }

  openCreateAdminDialog(): void {
    const dialogRef = this.dialog.open(CreateAdminDialogComponent, {
      width: '520px',
      panelClass: USERS_DIALOG_PANEL,
      data: {
        title: 'Create New Admin',
        description: 'Add a new administrator account with full dashboard access.',
        submitLabel: 'Create Admin',
        role: 'admin',
      } as CreateAccountDialogData,
    });

    dialogRef.afterClosed().subscribe((payload) => {
      if (!payload) return;
      this.createAdmin(payload);
    });
  }

  private createAdmin(payload: CreateAccountPayload): void {
    this.creatingAdmin.set(true);
    this.adminService.registerAccount({ ...payload, role: 'admin', skipLogin: true }).subscribe({
      next: (res) => {
        const newAdmin = res?.data?.user;
        if (newAdmin) {
          this.allUsers.update((list) => [newAdmin, ...list]);
        } else {
          this.load();
        }
        this.toastr.success('New admin account created successfully.', 'Admin created');
        this.sessionNotifications.add(
          `Admin account created for ${payload.name.en}`,
          'success',
        );
        this.resetPagination();
        this.creatingAdmin.set(false);
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || 'Could not create admin account.', 'Create failed');
        this.creatingAdmin.set(false);
      },
    });
  }

  openDetail(id: string): void {
    this.router.navigate(['/dashboard/admins', id]);
  }

  currentPlanChoice(admin: any): string {
    return admin?.role === 'admin' ? 'Unlimited' : admin.plan;
  }

  isUnlimitedAdmin(admin: any): boolean {
    return admin?.role === 'admin' || this.currentPlanChoice(admin) === 'Unlimited';
  }

  getPlanTextClass(plan: string): string {
    if (plan === 'Unlimited') return 'text-amber-700 dark:text-amber-300';
    if (plan === 'Enterprise') return 'text-purple-700 dark:text-purple-300';
    if (plan === 'Pro') return 'text-emerald-700 dark:text-emerald-300';
    return 'text-blue-700 dark:text-blue-300';
  }

  getPlanBadgeClass(plan: string): string {
    if (plan === 'Unlimited') {
      return 'bg-amber-100 text-amber-800 dark:bg-amber-500/25 dark:text-amber-200';
    }
    if (plan === 'Enterprise') {
      return 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300';
    }
    if (plan === 'Pro') {
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300';
    }
    return 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300';
  }

  requestUpgradePlan(admin: any): void {
    if (admin?.role === 'admin') {
      this.toastr.info('Admin plan is locked to Unlimited.', 'Plan locked');
      return;
    }
    const newPlan = this.currentPlanChoice(admin);
    if (newPlan === admin.plan) return;
    this.toastr.info('Admin plan is locked to Unlimited.', 'Plan locked');
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

  hasCv(user: any): boolean {
    return Array.isArray(user.cvs) && user.cvs.length > 0;
  }

  cvCount(user: any): number {
    return Array.isArray(user.cvs) ? user.cvs.length : 0;
  }

  getTokenPct(user: any): number {
    if (this.isUnlimitedAdmin(user)) return 0;
    const tokenLimit = Number(user?.maxToken) || 0;
    if (!tokenLimit) return 0;
    const usage = Number(user?.tokenUsage) || 0;
    return Math.min(100, Math.round((Math.max(0, usage) / tokenLimit) * 100));
  }

  formatTokens(value: unknown): string {
    const tokens = Number(value) || 0;
    return tokens >= 1000 ? `${(tokens / 1000).toFixed(1)}k` : String(tokens);
  }

  formatLastLogin(value: unknown): string {
    if (!value) return 'Never';
    const date = new Date(value as string);
    if (Number.isNaN(date.getTime())) return 'Never';
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  isDefaultAvatar(url: string): boolean {
    return !url || url.includes('149071');
  }

  readonly avatarPalette = [
    { bg: 'bg-indigo-100 dark:bg-indigo-500/20', text: 'text-indigo-700 dark:text-indigo-300' },
    { bg: 'bg-violet-100 dark:bg-violet-500/20', text: 'text-violet-700 dark:text-violet-300' },
    { bg: 'bg-cyan-100 dark:bg-cyan-500/20',     text: 'text-cyan-700 dark:text-cyan-300'     },
    { bg: 'bg-emerald-100 dark:bg-emerald-500/20',text:'text-emerald-700 dark:text-emerald-300'},
  ];

  getAvatar(index: number) {
    return this.avatarPalette[index % this.avatarPalette.length];
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((p) => p + 1);
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update((p) => p - 1);
    }
  }

  resetPagination(): void {
    this.currentPage.set(1);
  }
}
