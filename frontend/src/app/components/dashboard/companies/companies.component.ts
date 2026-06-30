
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
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import {
  LucideAngularModule,
  Search,
  ChevronDown,
  MoreVertical,
  Eye,
  ArrowUp,
  Trash2,
  Building2,
  ChevronLeft,
  ChevronRight,
  Ban,
  Check,
} from 'lucide-angular';

import { CompanyService } from '../../../services/company.service';
import { CompanyItem } from '../../../models/company.model';
import { CompanyPlanUpdateDialogComponent } from './plan-update-dialog/company-plan-update-dialog';
import { CompanyConfirmDialogComponent } from './confirm-dialog/Company-confirm-dialog';
import { COMPANY_PLANS } from './company-plan.util';
import {
  companyPlanBadgeClass,
  companyStatusBadgeClass,
  COMPANIES_CARD,
  COMPANIES_DIALOG_PANEL,
  COMPANIES_INPUT,
  COMPANIES_MENU_FIXED,
  COMPANIES_MENU_ITEM,
  COMPANIES_PLAN_SUBMENU,
} from './companies-theme';
import { ToastrService } from 'ngx-toastr';
import { SessionNotificationsService } from '../../../services/session-notifications.service';
import { CreateAccountDialogData, CreateAccountPayload, CreateAdminDialogComponent } from '../admins/create-admin-dialog/create-admin-dialog.component';

@Component({
  selector: 'app-companies',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
    RouterModule,
    MatDialogModule,
    MatButtonModule,
  ],
  templateUrl: './companies.component.html',
})
export class CompaniesComponent implements OnInit {
  Math = Math;
  private readonly viewportPadding = 8;

  // =========================
  // UI CONFIGURATION
  // =========================
  readonly ui = {
    card:        COMPANIES_CARD,
    input:       COMPANIES_INPUT,
    menu:        COMPANIES_MENU_FIXED,
    menuItem:    COMPANIES_MENU_ITEM,
    planSubmenu: COMPANIES_PLAN_SUBMENU,
  };

  readonly planBadgeClass   = companyPlanBadgeClass;
  readonly statusBadgeClass = companyStatusBadgeClass;

  // =========================
  // DEPENDENCY INJECTION
  // =========================
  // Changed: `private` → `private readonly` to prevent accidental reassignment.
  private readonly companyService = inject(CompanyService);
  private readonly dialog         = inject(MatDialog);
  private readonly fb             = inject(FormBuilder);
  private readonly toastr         = inject(ToastrService);
  private readonly sessionNotifications = inject(SessionNotificationsService);

  icons = {
    Search, ChevronDown, MoreVertical, Eye, ArrowUp,
    Trash2, Building2, ChevronLeft, ChevronRight, Ban, Check,
  };

  // =========================
  // REACTIVE FORM (FILTERS)
  // =========================
  filterForm: FormGroup = this.fb.group({
    searchQuery:  [''],
    planFilter:   [''],
    statusFilter: [''],
    searchCountFilter: [''],
  });

  // =========================
  // STATE (SIGNALS)
  // =========================
  companies            = signal<CompanyItem[]>([]);
  loading              = signal(true);
  creatingCompany      = signal(false);
  openMenuId           = signal<string | null>(null);
  planSubmenuCompanyId = signal<string | null>(null);
  menuAnchor           = signal<{ top: number; left: number } | null>(null);

  currentPage = signal(1);
  pageSize    = signal(10);

  private searchQuery  = signal('');
  private planFilter   = signal('');
  private statusFilter = signal('');
  private searchCountFilter = signal('');

  readonly plans = [...COMPANY_PLANS];
  readonly planMeta: Record<string, { subtitle: string; tokenLabel: string }> = {
    Free: { subtitle: 'Basic access for getting started', tokenLabel: '1,000 tokens' },
    Pro: { subtitle: 'Higher usage for active teams', tokenLabel: '2,000 tokens' },
    Enterprise: { subtitle: 'Maximum allowance for heavy usage', tokenLabel: '4,000 tokens' },
  };

  // =========================
  // COMPUTED VALUES
  // =========================

  openMenuCompany = computed(() => {
    const id = this.openMenuId();
    if (!id) return null;
    return this.companies().find((c) => c._id === id) ?? null;
  });

  filteredCompanies = computed(() => {
    const q      = this.searchQuery().toLowerCase();
    const plan   = this.planFilter();
    const status = this.statusFilter();
    const searchCount = this.searchCountFilter();

    return this.companies().filter((c) => {
      if (c.role !== 'company') return false;

      const name = this.getName(c).toLowerCase();

      if (q && !name.includes(q) && !c.email.toLowerCase().includes(q)) return false;
      if (plan && c.plan !== plan) return false;

      if (status === 'active'  && c.isBlocked)  return false;
      if (status === 'blocked' && !c.isBlocked) return false;
      const count = this.getSearchCount(c);
      if (searchCount === 'none' && count !== 0) return false;
      if (searchCount === 'low' && (count < 1 || count > 50)) return false;
      if (searchCount === 'mid' && (count < 51 || count > 200)) return false;
      if (searchCount === 'high' && count < 201) return false;

      return true;
    });
  });

  paginatedCompanies = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredCompanies().slice(start, start + this.pageSize());
  });

  totalPages  = computed(() => Math.ceil(this.filteredCompanies().length / this.pageSize()));
  pageNumbers = computed(() =>
    Array.from({ length: this.totalPages() }, (_, i) => i + 1)
  );

  // =========================
  // LIFECYCLE
  // =========================

  constructor() {
    effect(() => {
      this.searchQuery();
      this.planFilter();
      this.statusFilter();
      this.searchCountFilter();
      this.resetPagination();
    });
  }

  ngOnInit(): void {
    this.companyService.getAllCompanies().subscribe({
      next: (res) => {
        this.companies.set(res.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    this.filterForm.valueChanges.subscribe((vals) => {
      this.searchQuery.set(vals.searchQuery   ?? '');
      this.planFilter.set(vals.planFilter     ?? '');
      this.statusFilter.set(vals.statusFilter ?? '');
      this.searchCountFilter.set(vals.searchCountFilter ?? '');
    });
  }

  openCreateCompanyDialog(): void {
    const dialogRef = this.dialog.open(CreateAdminDialogComponent, {
      width: '520px',
      panelClass: COMPANIES_DIALOG_PANEL,
      data: {
        title: 'Create New Company',
        description: 'Add a new company account with company permissions.',
        submitLabel: 'Create Company',
        role: 'company',
      } as CreateAccountDialogData,
    });

    dialogRef.afterClosed().subscribe((payload) => {
      if (!payload) return;
      this.createCompany(payload);
    });
  }

  private createCompany(payload: CreateAccountPayload): void {
    this.creatingCompany.set(true);
    this.companyService.registerCompanyAccount({ ...payload, role: 'company', skipLogin: true }).subscribe({
      next: (res) => {
        const newCompany = res?.data?.user;
        if (newCompany) {
          this.companies.update((list) => [newCompany, ...list]);
        } else {
          this.companyService.getAllCompanies().subscribe({
            next: (listRes) => this.companies.set(listRes.data ?? []),
          });
        }
        this.toastr.success('New company account created successfully.', 'Company created');
        this.sessionNotifications.add(`Admin created company ${payload.name.en}`, 'success');
        this.resetPagination();
        this.creatingCompany.set(false);
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || 'Could not create company account.', 'Create failed');
        this.creatingCompany.set(false);
      },
    });
  }

  // =========================
  // HELPER FUNCTIONS
  // =========================

  getName(c: CompanyItem): string {
    if (!c.name) return '—';
    if (typeof c.name === 'string') return c.name;
    return c.name.en || c.name.ar || '—';
  }

  getInitials(c: CompanyItem): string {
    return this.getName(c)
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  getTokenPct(c: CompanyItem): number {
    const tokenLimit = Number(c.maxToken) || 0;
    if (!tokenLimit) return 0;
    const usage = Number(c.tokenUsage) || 0;
    return Math.min(100, Math.round((Math.max(0, usage) / tokenLimit) * 100));
  }

  formatTokens(n: number): string {
    return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n);
  }

  getPlanTokenTextClass(plan: string): string {
    if (plan === 'Enterprise') return 'text-purple-700 dark:text-purple-300';
    if (plan === 'Pro') return 'text-emerald-700 dark:text-emerald-300';
    return 'text-blue-700 dark:text-blue-300';
  }

  getAiCallCount(c: CompanyItem): number {
    const raw = c.aiCallsCount ?? c.searches ?? 0;
    return Number(raw) || 0;
  }

  getSearchCount(c: CompanyItem): number {
    const raw = c.searches ?? c.aiCallsCount ?? 0;
    return Number(raw) || 0;
  }

  // =========================
  // UI COLORS
  // =========================
  readonly avatarColors = [
    { bg: 'bg-violet-100', text: 'text-violet-700' },
    { bg: 'bg-cyan-100',   text: 'text-cyan-700'   },
    { bg: 'bg-indigo-100', text: 'text-indigo-700' },
    { bg: 'bg-amber-100',  text: 'text-amber-700'  },
    { bg: 'bg-pink-100',   text: 'text-pink-700'   },
  ];

  getAvatarColor(index: number) {
    return this.avatarColors[index % this.avatarColors.length];
  }

  // =========================
  // MENU HANDLING
  // =========================

  toggleMenu(id: string, event: Event): void {
    event.stopPropagation();

    if (this.openMenuId() === id) {
      this.closeMenu();
      return;
    }

    this.planSubmenuCompanyId.set(null);
    this.openMenuId.set(id);
    this.menuAnchor.set(this.computeMenuAnchor(event.currentTarget as HTMLElement));
    this.deferMenuRealign();
  }

  closeMenu(): void {
    this.openMenuId.set(null);
    this.planSubmenuCompanyId.set(null);
    this.menuAnchor.set(null);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.openMenuId()) return;

    const t = event.target as HTMLElement;
    if (
      t.closest('[data-companies-menu]') ||
      t.closest('[data-companies-menu-trigger]')
    ) return;

    this.closeMenu();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (this.openMenuId()) this.closeMenu();
  }

  private computeMenuAnchor(trigger: HTMLElement) {
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
    const shouldOpenAbove =
      preferredBelowTop + estimatedHeight > window.innerHeight - viewportPadding && canOpenAbove;
    const rawTop = shouldOpenAbove ? preferredAboveTop : preferredBelowTop;
    const maxTop = Math.max(viewportPadding, window.innerHeight - estimatedHeight - viewportPadding);
    const top = Math.max(viewportPadding, Math.min(rawTop, maxTop));

    return { top, left };
  }

  togglePlanSubmenu(companyId: string, event: Event): void {
    event.stopPropagation();
    const next = this.planSubmenuCompanyId() === companyId ? null : companyId;
    this.planSubmenuCompanyId.set(next);
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
    return document.querySelector('[data-companies-menu]') as HTMLElement | null;
  }

  getPlanSubtitle(plan: string): string {
    return this.planMeta[plan]?.subtitle ?? 'Plan option';
  }

  getPlanTokenLabel(plan: string): string {
    return this.planMeta[plan]?.tokenLabel ?? '—';
  }

  banCompany(company: CompanyItem): void {
    const action = company.isBlocked ? 'unban' : 'ban';

    const dialogRef = this.dialog.open(CompanyConfirmDialogComponent, {
      width: '420px',
      panelClass: COMPANIES_DIALOG_PANEL,
      data: {
        title: company.isBlocked ? 'Unban Company' : 'Ban Company',
        message: `Are you sure you want to ${action} ${this.getName(company)}?`,
        confirmLabel: company.isBlocked ? 'Unban' : 'Ban',
        confirmDanger: !company.isBlocked,
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.companyService.toggleBan(company._id).subscribe({
        next: (res) => {
          this.companies.update((list) =>
            list.map((c) =>
              c._id === company._id ? { ...c, isBlocked: res.data.isBlocked } : c,
            ),
          );
          this.toastr.success(
            res.data.isBlocked
              ? `${this.getName(company)} has been banned.`
              : `${this.getName(company)} has been unbanned.`,
            'Company updated',
          );
          this.sessionNotifications.add(
            res.data.isBlocked
              ? `Admin banned company ${this.getName(company)}`
              : `Admin unbanned company ${this.getName(company)}`,
            'warning',
          );
        },
        error: (err) => {
          this.toastr.error(err.error?.message || 'Could not update company status.', 'Action failed');
        },
      });
    });
  }

  deleteCompany(id: string): void {
    const c = this.companies().find((x) => x._id === id);

    const dialogRef = this.dialog.open(CompanyConfirmDialogComponent, {
      width: '420px',
      panelClass: COMPANIES_DIALOG_PANEL,
      data: {
        title: 'Delete company',
        message: c
          ? `Are you sure you want to delete ${this.getName(c)}? This action cannot be undone.`
          : 'Are you sure you want to delete this company? This action cannot be undone.',
        confirmLabel: 'Delete',
        confirmDanger: true,
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.companyService.deleteCompany(id).subscribe({
        next: () => {
          this.companies.update((list) => list.filter((x) => x._id !== id));
          this.closeMenu();
        },
      });
    });
  }

  requestPlanChange(c: CompanyItem, plan: string, event?: Event): void {
    event?.stopPropagation();
    if (plan === c.plan) return;

    this.closeMenu();

    const dialogRef = this.dialog.open(CompanyPlanUpdateDialogComponent, {
      width: '420px',
      panelClass: COMPANIES_DIALOG_PANEL,
      data: {
        company: { name: this.getName(c), email: c.email, plan: c.plan },
        newPlan: plan,
        isEnterprise: plan === 'Enterprise',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.companyService.updateCompanyPlan(c._id, plan).subscribe({
        next: (res) => {
          const updatedMaxToken = res?.data?.maxToken;
          this.companies.update((list) =>
            list.map((x) =>
              x._id === c._id ? { ...x, plan, maxToken: updatedMaxToken ?? x.maxToken } : x,
            )
          );
          this.toastr.success(`Plan changed to ${plan}.`, 'Plan updated');
          this.sessionNotifications.add(
            `Admin changed plan for company ${this.getName(c)} to ${plan}`,
            'info',
          );
          this.closeMenu();
        },
        error: (err) => {
          this.toastr.error(err.error?.message || 'Could not update company plan.', 'Update failed');
        },
      });
    });
  }

  // =========================
  // PAGINATION
  // =========================

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
