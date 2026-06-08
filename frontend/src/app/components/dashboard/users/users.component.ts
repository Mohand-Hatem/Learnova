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
  ChevronLeft,
  ChevronRight,
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
interface UserItem {
  _id: string;
  name: { en: string; ar: string } | string;
  email: string;
  role: string;
  plan: string;
  maxToken: number;
  tokenUsage: number;
  isBanned?: boolean;
  createdAt: string;
  cvs?: {
    atsScore: number;
    originalFile?: { url: string; fileName: string };
    processingStatus?: string;
  }[];
}

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

  menuAnchor = signal<{ top: number; left: number; flipAbove: boolean } | null>(null);

  openMenuUser = computed(() => {
    const id = this.openMenuId();
    if (!id) return null;
    return this.users().find((u) => u._id === id) ?? null;
  });
  readonly planBadgeClass = planBadgeClass;
  readonly atsBadgeClass = atsBadgeClass;

  private adminService = inject(AdminService);
  private dialog = inject(MatDialog);

  icons = {
    Search, ChevronDown, MoreVertical, Eye, FileText,
    ArrowUp, Ban, Trash2, X, User, CreditCard,
    Calendar, Activity, Zap, ChevronLeft, ChevronRight,
  };

  users = signal<UserItem[]>([]);
  loading = signal(true);
  searchQuery = signal('');
  planFilter = signal('');
  atsFilter = signal('');
  typeFilter = signal('');
  openMenuId = signal<string | null>(null);
  planSubmenuUserId = signal<string | null>(null);
  selectedUser = signal<UserItem | null>(null);

  // Pagination
  currentPage = signal(1);
  pageSize = signal(10);

  readonly plans = [...USER_PLANS];

  filteredUsers = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const plan = this.planFilter();
    const ats = this.atsFilter();
    const type = this.typeFilter();

    return this.users().filter((u) => {
       if (u.role === 'admin' ||  u.role === 'company' ) return false;
      const name = this.getName(u).toLowerCase();
      if (q && !name.includes(q) && !u.email.toLowerCase().includes(q)) return false;
      if (plan && u.plan !== plan) return false;
      if (type && u.role !== type) return false;
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
      this.typeFilter();
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
    if (!u.cvs || u.cvs.length === 0) return 0;
    const scores = u.cvs.map((c) => c.atsScore).filter((s) => s > 0);
    if (!scores.length) return 0;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
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
    if (!u.maxToken) return 0;
    return Math.round((u.tokenUsage / u.maxToken) * 100);
  }

  formatTokens(n: number): string {
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return String(n);
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
    flipAbove: boolean;
  } {
    const rect = trigger.getBoundingClientRect();
    const menuWidth = 200;
    const estimatedHeight = 280;
    const gap = 6;
    let left = rect.right - menuWidth;
    left = Math.max(8, Math.min(left, window.innerWidth - menuWidth - 8));
    const spaceBelow = window.innerHeight - rect.bottom;
    const flipAbove = spaceBelow < estimatedHeight && rect.top > estimatedHeight;
    const top = flipAbove ? rect.top - gap : rect.bottom + gap;
    return { top, left, flipAbove };
  }

  togglePlanSubmenu(userId: string, event: Event) {
    event.stopPropagation();
    this.planSubmenuUserId.set(this.planSubmenuUserId() === userId ? null : userId);
  }

  openDetail(u: UserItem) {
    this.selectedUser.set(u);
    this.closeMenu();
  }

  closeDetail() {
    this.selectedUser.set(null);
  }

  openCV(u: UserItem) {
  const cv = u.cvs?.[0];
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
      next: () => {
        this.users.update((list) =>
          list.map((x) => (x._id === userId ? { ...x, plan } : x)),
        );
        if (this.selectedUser()?._id === userId) {
          this.selectedUser.update((s) => (s ? { ...s, plan } : s));
        }
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
