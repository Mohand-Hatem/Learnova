import {
  Component,
  inject,
  signal,
  computed,
  effect,
  OnInit,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import {
  LucideAngularModule,
  Search,
  ChevronDown,
  MoreVertical,
  Eye,
  FileText,
  ArrowUp,
  Ban,
  Trash2,
  X,
  User,
  CreditCard,
  Calendar,
  Activity,
  Zap,
  Check,
  ChevronLeft,
  ChevronRight,
  UserPlus,
} from 'lucide-angular';
import { AdminService } from '../../../services/admin.service';
import { PlanUpdateDialogComponent } from './plan-update-dialog/plan-update-dialog.component';
import { ConfirmDialogComponent } from './confirm-dialog/confirm-dialog.component';
import { USER_PLANS } from './user-plan.util';
import { NoCvDialogComponent } from './no-cv-dialog/no-cv-dialog.component';
import {
  atsBadgeClass,
  planBadgeClass,
  USERS_CARD,
  USERS_DIALOG_PANEL,
  USERS_INPUT,
  USERS_MENU_FIXED,
  USERS_MENU_ITEM,
  USERS_PLAN_SUBMENU,
} from './users-theme';
import { ToastrService } from 'ngx-toastr';
import { SessionNotificationsService } from '../../../services/session-notifications.service';
import { CreateAccountDialogData, CreateAccountPayload, CreateAdminDialogComponent } from '../admins/create-admin-dialog/create-admin-dialog.component';
interface UserItem {
  _id: string;
  name: { en: string; ar: string } | string;
  email: string;
  role: string;
  plan: string;
  maxToken: number;
  tokenUsage: number;
  // isBanned?: boolean;
  isBlocked?: boolean;
  createdAt: string;
  cvs?: {
    atsScore: number;
    originalFile?: { url: string; fileName: string };
    processingStatus?: string;
    createdAt?: string;
  }[];
}

type UserCv = NonNullable<UserItem['cvs']>[number];

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, RouterModule, MatDialogModule, MatButtonModule],
  templateUrl: './users.component.html',
})
export class UsersComponent implements OnInit {
  Math = Math;
  readonly ui = {
    card: USERS_CARD,
    input: USERS_INPUT,
    menu: USERS_MENU_FIXED,
    menuItem: USERS_MENU_ITEM,
    planSubmenu: USERS_PLAN_SUBMENU,
  };

  menuAnchor = signal<{ top: number; left: number } | null>(null);
  private readonly viewportPadding = 8;

  openMenuUser = computed(() => {
    const id = this.openMenuId();
    if (!id) return null;
    return this.users().find((u) => u._id === id) ?? null;
  });
  readonly planBadgeClass = planBadgeClass;
  readonly atsBadgeClass = atsBadgeClass;

  private adminService = inject(AdminService);
  private dialog = inject(MatDialog);
  private toastr = inject(ToastrService);
  private sessionNotifications = inject(SessionNotificationsService);

  icons = {
    Search, ChevronDown, MoreVertical, Eye, FileText,
    ArrowUp, Ban, Trash2, X, User, CreditCard,
    Calendar, Activity, Zap, Check, ChevronLeft, ChevronRight, UserPlus,
  };

  users = signal<UserItem[]>([]);
  loading = signal(true);
  searchQuery = signal('');
  planFilter = signal('');
  atsFilter = signal('');
  hasCvFilter = signal('');
  bannedFilter = signal('');
  openMenuId = signal<string | null>(null);
  planSubmenuUserId = signal<string | null>(null);
  selectedUser = signal<UserItem | null>(null);
  creatingUser = signal(false);

  // Pagination
  currentPage = signal(1);
  pageSize = signal(10);

  readonly plans = [...USER_PLANS];
  readonly planMeta: Record<string, { subtitle: string; tokenLabel: string }> = {
    Free: { subtitle: 'Basic access for getting started', tokenLabel: '1,000 tokens' },
    Pro: { subtitle: 'Higher usage for active candidates', tokenLabel: '2,000 tokens' },
    Enterprise: { subtitle: 'Maximum allowance for heavy usage', tokenLabel: '4,000 tokens' },
  };

  filteredUsers = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const plan = this.planFilter();
    const ats = this.atsFilter();
    const hasCv = this.hasCvFilter();
    const banned = this.bannedFilter();

    return this.users().filter((u) => {
       if (u.role === 'admin' ||  u.role === 'company' ) return false;
      const name = this.getName(u).toLowerCase();
      if (q && !name.includes(q) && !u.email.toLowerCase().includes(q)) return false;
      if (plan && u.plan !== plan) return false;
      if (hasCv === 'yes' && !this.hasCv(u)) return false;
      if (hasCv === 'no' && this.hasCv(u)) return false;
      if (banned === 'banned' && !u.isBlocked) return false;
      if (banned === 'active' && u.isBlocked) return false;
      const score = this.getAts(u);
      if (ats === 'high' && score < 80) return false;
      if (ats === 'mid' && (score < 60 || score >= 80)) return false;
      if (ats === 'low' && score >= 60) return false;
      return true;
    });
  });

  paginatedUsers = computed(() => {
    const filtered = this.filteredUsers();
    const start = (this.currentPage() - 1) * this.pageSize();
    return filtered.slice(start, start + this.pageSize());
  });

  totalPages = computed(() => {
    return Math.ceil(this.filteredUsers().length / this.pageSize());
  });

  pageNumbers = computed(() =>
    Array.from({ length: this.totalPages() }, (_, i) => i + 1),
  );

  constructor() {
    effect(() => {
      this.searchQuery();
      this.planFilter();
      this.atsFilter();
      this.hasCvFilter();
      this.bannedFilter();
      this.resetPagination();
    });
  }

  ngOnInit() {
   this.adminService.getAllUsers().subscribe({
      next: (res) => {
        this.users.set(res.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openCreateUserDialog(): void {
    const dialogRef = this.dialog.open(CreateAdminDialogComponent, {
      width: '520px',
      panelClass: USERS_DIALOG_PANEL,
      data: {
        title: 'Create New User',
        description: 'Add a new user account with the default user role.',
        submitLabel: 'Create User',
        role: 'user',
      } as CreateAccountDialogData,
    });

    dialogRef.afterClosed().subscribe((payload) => {
      if (!payload) return;
      this.createUser(payload);
    });
  }

  private createUser(payload: CreateAccountPayload): void {
    this.creatingUser.set(true);
    this.adminService.registerAccount({ ...payload, role: 'user', skipLogin: true }).subscribe({
      next: (res) => {
        const newUser = res?.data?.user;
        if (newUser) {
          this.users.update((list) => [newUser, ...list]);
        } else {
          this.adminService.getAllUsers().subscribe({
            next: (listRes) => this.users.set(listRes.data ?? []),
          });
        }
        this.toastr.success('New user account created successfully.', 'User created');
        this.sessionNotifications.add(`Admin created user ${payload.name.en}`, 'success');
        this.resetPagination();
        this.creatingUser.set(false);
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || 'Could not create user account.', 'Create failed');
        this.creatingUser.set(false);
      },
    });
  }

  getName(u: UserItem): string {
    if (!u.name) return '—';
    if (typeof u.name === 'string') return u.name;
    return u.name.en || u.name.ar || '—';
  }

  getInitials(u: UserItem): string {
    return this.getName(u)
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  getAts(u: UserItem): number {
    const cvs = this.getSortedCvs(u);
    if (!cvs.length) return 0;
    const scores = cvs.map((c) => Number(c.atsScore) || 0).filter((s) => s > 0);
    if (!scores.length) return 0;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }

  hasCv(u: UserItem): boolean {
    return this.getSortedCvs(u).length > 0;
  }

  getAtsClass(score: number): string {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-error';
  }

  getAtsBarColor(score: number): string {
    if (score >= 80) return 'bg-success';
    if (score >= 60) return 'bg-warning';
    return 'bg-error';
  }

  getAtsLabel(score: number): string {
    if (score >= 80) return 'Strong profile — above average';
    if (score >= 60) return 'Average profile — needs improvement';
    if (score === 0) return 'No CV uploaded yet';
    return 'Weak profile — major gaps detected';
  }

  getTokenPct(u: UserItem): number {
    const tokenLimit = Number(u.maxToken) || 0;
    if (!tokenLimit) return 0;
    const usage = Number(u.tokenUsage) || 0;
    return Math.min(100, Math.round((Math.max(0, usage) / tokenLimit) * 100));
  }

  formatTokens(n: number): string {
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return String(n);
  }

  getPlanTokenTextClass(plan: string): string {
    if (plan === 'Enterprise') return 'text-purple-700 dark:text-purple-300';
    if (plan === 'Pro') return 'text-emerald-700 dark:text-emerald-300';
    return 'text-blue-700 dark:text-blue-300';
  }

  avatarColors = [
    { bg: 'bg-violet-100 dark:bg-violet-500/20', text: 'text-violet-700 dark:text-violet-300' },
    { bg: 'bg-cyan-100 dark:bg-cyan-500/20', text: 'text-cyan-700 dark:text-cyan-300' },
    { bg: 'bg-indigo-100 dark:bg-indigo-500/20', text: 'text-indigo-700 dark:text-indigo-300' },
    { bg: 'bg-amber-100 dark:bg-amber-500/20', text: 'text-amber-700 dark:text-amber-300' },
    { bg: 'bg-pink-100 dark:bg-pink-500/20', text: 'text-pink-700 dark:text-pink-300' },
  ];

  getAvatarColor(index: number) {
    return this.avatarColors[index % this.avatarColors.length];
  }

  toggleMenu(id: string, event: Event) {
    event.stopPropagation();
    if (this.openMenuId() === id) {
      this.closeMenu();
      return;
    }
    this.planSubmenuUserId.set(null);
    this.openMenuId.set(id);
    this.menuAnchor.set(this.computeMenuAnchor(event.currentTarget as HTMLElement));
    this.deferMenuRealign();
  }

  closeMenu() {
    this.openMenuId.set(null);
    this.planSubmenuUserId.set(null);
    this.menuAnchor.set(null);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.openMenuId()) return;
    const target = event.target as HTMLElement;
    if (
      target.closest('[data-users-menu]') ||
      target.closest('[data-users-menu-trigger]')
    ) {
      return;
    }
    this.closeMenu();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (this.openMenuId()) this.closeMenu();
  }

  private computeMenuAnchor(trigger: HTMLElement): {
    top: number;
    left: number;
  } {
    const rect = trigger.getBoundingClientRect();
    const menuWidth = 250;
    const estimatedHeight = 360;
    const gap = 6;
    const viewportPadding = this.viewportPadding;
    let left = rect.right - menuWidth;
    left = Math.max(viewportPadding, Math.min(left, window.innerWidth - menuWidth - viewportPadding));

    const preferredBelowTop = rect.bottom + gap;
    const preferredAboveTop = rect.top - gap - estimatedHeight;
    const canOpenAbove = preferredAboveTop >= viewportPadding;
    const shouldOpenAbove = preferredBelowTop + estimatedHeight > window.innerHeight - viewportPadding && canOpenAbove;
    const rawTop = shouldOpenAbove ? preferredAboveTop : preferredBelowTop;
    const maxTop = Math.max(viewportPadding, window.innerHeight - estimatedHeight - viewportPadding);
    const top = Math.max(viewportPadding, Math.min(rawTop, maxTop));

    return { top, left };
  }

  togglePlanSubmenu(userId: string, event: Event) {
    event.stopPropagation();
    const next = this.planSubmenuUserId() === userId ? null : userId;
    this.planSubmenuUserId.set(next);
    this.deferMenuRealign(next !== null);
  }

  private deferMenuRealign(expanded = false): void {
    requestAnimationFrame(() => this.adjustMenuTop(expanded));
  }

  private adjustMenuTop(expanded = false): void {
    const anchor = this.menuAnchor();
    if (!anchor) return;

    const viewportPadding = this.viewportPadding;
    const menuHeight = this.getMenuElement()?.offsetHeight;
    const estimatedHeight = menuHeight ?? (expanded ? 440 : 360);
    const maxTop = Math.max(viewportPadding, window.innerHeight - estimatedHeight - viewportPadding);
    const top = Math.max(viewportPadding, Math.min(anchor.top, maxTop));

    if (top !== anchor.top) {
      this.menuAnchor.set({ ...anchor, top });
    }
  }

  private getMenuElement(): HTMLElement | null {
    return document.querySelector('[data-users-menu]') as HTMLElement | null;
  }

  getPlanSubtitle(plan: string): string {
    return this.planMeta[plan]?.subtitle ?? 'Plan option';
  }

  getPlanTokenLabel(plan: string): string {
    return this.planMeta[plan]?.tokenLabel ?? '—';
  }

  openDetail(u: UserItem) {
    this.selectedUser.set(u);
    this.closeMenu();
  }

  closeDetail() {
    this.selectedUser.set(null);
  }

  openCV(u: UserItem) {
    const cv = this.getSortedCvs(u).find((item) => !!item.originalFile?.url);
    if (cv?.originalFile?.url) {
      window.open(cv.originalFile.url, '_blank');
    } else {
      this.dialog.open(NoCvDialogComponent, {
        width: '360px',
        panelClass: USERS_DIALOG_PANEL,
        data: { userName: this.getName(u) },
      });
    }
  }

  private getSortedCvs(u: UserItem): UserCv[] {
    const cvs = Array.isArray(u.cvs) ? [...u.cvs] : [];
    return cvs.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
  }

banUser(u: UserItem) {
  const action = u.isBlocked ? 'unban' : 'ban';
  const dialogRef = this.dialog.open(ConfirmDialogComponent, {
    width: '420px',
    panelClass: USERS_DIALOG_PANEL,
    data: {
      title: u.isBlocked ? 'Unban User' : 'Ban User',
      message: `Are you sure you want to ${action} ${this.getName(u)}?`,
      confirmLabel: u.isBlocked ? 'Unban' : 'Ban',
      confirmDanger: !u.isBlocked,
    },
  });
  dialogRef.afterClosed().subscribe((confirmed) => {
    if (!confirmed) return;
    this.adminService.toggleBan(u._id).subscribe({
      next: (res) => {
        this.users.update(list =>
          list.map(x => x._id === u._id ? { ...x, isBlocked: res.data.isBlocked } : x)
        );
        this.toastr.success(
          res.data.isBlocked ? `${this.getName(u)} has been banned.` : `${this.getName(u)} has been unbanned.`,
          'User updated',
        );
        this.sessionNotifications.add(
          res.data.isBlocked
            ? `Admin banned user ${this.getName(u)}`
            : `Admin unbanned user ${this.getName(u)}`,
          'warning',
        );
      },
      error: (err) => {
        this.toastr.error(err.error?.message || 'Could not update user status.', 'Action failed');
      },
    });
  });
}

  deleteUser(id: string) {
    const u = this.users().find((x) => x._id === id);
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      panelClass: USERS_DIALOG_PANEL,
      data: {
        title: 'Delete user',
        message: u
          ? `Are you sure you want to delete ${this.getName(u)}? This action cannot be undone.`
          : 'Are you sure you want to delete this user? This action cannot be undone.',
        confirmLabel: 'Delete',
        confirmDanger: true,
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.adminService.deleteUser(id).subscribe({
        next: () => {
          this.users.update((list) => list.filter((x) => x._id !== id));
          this.closeDetail();
          this.closeMenu();
          this.toastr.success('User deleted successfully.', 'Deleted');
          if (u) this.sessionNotifications.add(`Admin deleted user ${this.getName(u)}`, 'error');
        },
        error: (err) => {
          this.toastr.error(err.error?.message || 'Could not delete user.', 'Delete failed');
        },
      });
    });
  }

  requestPlanChange(u: UserItem, plan: string, event?: Event) {
    event?.stopPropagation();
    if (plan === u.plan) return;

    this.closeMenu();

    const dialogRef = this.dialog.open(PlanUpdateDialogComponent, {
      width: '420px',
      panelClass: USERS_DIALOG_PANEL,
      data: { user: u, newPlan: plan, isEnterprise: plan === 'Enterprise' },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.updatePlanInBackend(u._id, plan);
      }
    });
  }

  private updatePlanInBackend(userId: string, plan: string) {
    this.adminService.updatePlan(userId, plan).subscribe({
      next: (res) => {
        const updatedMaxToken = res?.data?.maxToken;
        this.users.update((list) =>
          list.map((x) =>
            x._id === userId ? { ...x, plan, maxToken: updatedMaxToken ?? x.maxToken } : x,
          ),
        );
        if (this.selectedUser()?._id === userId) {
          this.selectedUser.update((s) =>
            s ? { ...s, plan, maxToken: updatedMaxToken ?? s.maxToken } : s,
          );
        }
        this.toastr.success(`Plan changed to ${plan}.`, 'Plan updated');
        const changedUser = this.users().find((x) => x._id === userId);
        this.sessionNotifications.add(
          `Admin changed plan for ${changedUser ? this.getName(changedUser) : 'a user'} to ${plan}`,
          'info',
        );
      },
      error: (err) => {
        this.toastr.error(err.error?.message || 'Could not update user plan.', 'Update failed');
      },
    });
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
    }
  }

  resetPagination() {
    this.currentPage.set(1);
  }
}
