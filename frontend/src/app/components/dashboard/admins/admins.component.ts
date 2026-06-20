import {
  Component,
  computed,
  effect,
  HostListener,
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
  ArrowUp,
  ChevronDown,
  Check,
  ChevronLeft,
  ChevronRight,
} from 'lucide-angular';
import { AdminService } from '../../../services/admin.service';
import { ToastrService } from 'ngx-toastr';
import { SessionNotificationsService } from '../../../services/session-notifications.service';
import { USERS_DIALOG_PANEL } from '../users/users-theme';
import { PlanUpdateDialogComponent } from '../users/plan-update-dialog/plan-update-dialog.component';
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
  readonly planDraft = signal<Record<string, string>>({});
  readonly upgradingId = signal<string | null>(null);
  readonly creatingAdmin = signal(false);
  readonly openPlanMenuId = signal<string | null>(null);
  readonly currentPage = signal(1);
  readonly pageSize = signal(10);
  readonly plans = ['Free', 'Pro', 'Enterprise'];
  readonly planMeta: Record<string, { subtitle: string; tokenLabel: string }> = {
    Free: { subtitle: 'Basic access for getting started', tokenLabel: '1,000 tokens' },
    Pro: { subtitle: 'Higher usage for active candidates', tokenLabel: '2,000 tokens' },
    Enterprise: { subtitle: 'Maximum allowance for heavy usage', tokenLabel: '4,000 tokens' },
  };

  readonly icons = {
    ShieldCheck, ShieldPlus, Search, RefreshCw, UserX, FileText, FileX, Eye, ArrowUp,
    ChevronDown, Check, ChevronLeft, ChevronRight,
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
    return this.planDraft()[admin._id] ?? admin.plan;
  }

  setPlanChoice(adminId: string, plan: string): void {
    this.planDraft.update((draft) => ({ ...draft, [adminId]: plan }));
  }

  getPlanSubtitle(plan: string): string {
    return this.planMeta[plan]?.subtitle ?? 'Plan option';
  }

  getPlanTokenLabel(plan: string): string {
    return this.planMeta[plan]?.tokenLabel ?? '—';
  }

  getPlanTextClass(plan: string): string {
    if (plan === 'Enterprise') return 'text-purple-700 dark:text-purple-300';
    if (plan === 'Pro') return 'text-emerald-700 dark:text-emerald-300';
    return 'text-blue-700 dark:text-blue-300';
  }

  togglePlanMenu(adminId: string, event: Event): void {
    event.stopPropagation();
    this.openPlanMenuId.update((id) => (id === adminId ? null : adminId));
  }

  closePlanMenu(): void {
    this.openPlanMenuId.set(null);
  }

  selectPlanFromMenu(adminId: string, plan: string, event: Event): void {
    event.stopPropagation();
    this.setPlanChoice(adminId, plan);
    this.closePlanMenu();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.openPlanMenuId()) return;
    const target = event.target as HTMLElement;
    if (
      target.closest('[data-admin-plan-menu]') ||
      target.closest('[data-admin-plan-trigger]')
    ) {
      return;
    }
    this.closePlanMenu();
  }

  canUpgrade(admin: any): boolean {
    return this.currentPlanChoice(admin) !== admin.plan;
  }

  requestUpgradePlan(admin: any): void {
    const newPlan = this.currentPlanChoice(admin);
    if (newPlan === admin.plan) return;

    const dialogRef = this.dialog.open(PlanUpdateDialogComponent, {
      width: '420px',
      panelClass: USERS_DIALOG_PANEL,
      data: {
        user: admin,
        newPlan,
        isEnterprise: newPlan === 'Enterprise',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.upgradePlan(admin);
    });
  }

  private upgradePlan(admin: any): void {
    const newPlan = this.currentPlanChoice(admin);
    if (newPlan === admin.plan) return;

    this.upgradingId.set(admin._id);
    this.adminService.updatePlan(admin._id, newPlan).subscribe({
      next: (res) => {
        const updatedMaxToken = res?.data?.maxToken;
        this.allUsers.update((list) =>
          list.map((u) =>
            u._id === admin._id
              ? { ...u, plan: newPlan, maxToken: updatedMaxToken ?? u.maxToken }
              : u,
          ),
        );
        this.planDraft.update((draft) => ({ ...draft, [admin._id]: newPlan }));
        this.toastr.success(`${this.getName(admin)} plan upgraded to ${newPlan}.`, 'Plan updated');
        this.sessionNotifications.add(
          `Admin changed plan for ${this.getName(admin)} to ${newPlan}`,
          'info',
        );
        this.upgradingId.set(null);
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || 'Could not upgrade admin plan.', 'Update failed');
        this.upgradingId.set(null);
      },
    });
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
    const tokenLimit = Number(user?.maxToken) || 0;
    if (!tokenLimit) return 0;
    const usage = Number(user?.tokenUsage) || 0;
    return Math.min(100, Math.round((Math.max(0, usage) / tokenLimit) * 100));
  }

  formatTokens(value: unknown): string {
    const tokens = Number(value) || 0;
    return tokens >= 1000 ? `${(tokens / 1000).toFixed(1)}k` : String(tokens);
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
