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
} from 'lucide-angular';

import { CompanyService } from '../../../services/company.service';
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

interface CompanyItem {
  _id: string;
  name: { en: string; ar: string } | string;
  email: string;
  plan: string;
  maxToken: number;
  tokenUsage: number;
  role: string;
  isBlocked?: boolean;
  createdAt: string;
  searches?: number | null;
}

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
/**
 * CompaniesComponent
 * -------------------
 * مسؤول عن إدارة وعرض قائمة الشركات داخل لوحة التحكم:
 * - عرض الشركات مع الفلترة والبحث
 * - Pagination
 * - فتح menu لكل شركة (block / delete / change plan)
 * - التعامل مع dialogs
 * - تحديث البيانات بشكل reactive باستخدام signals
 */

export class CompaniesComponent implements OnInit {
  Math = Math;

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

  // CSS badge helpers
  readonly planBadgeClass   = companyPlanBadgeClass;
  readonly statusBadgeClass = companyStatusBadgeClass;

  // =========================
  // DEPENDENCY INJECTION
  // =========================
  private companyService = inject(CompanyService);
  private dialog         = inject(MatDialog);
  private fb             = inject(FormBuilder);

  // Icons used in template
  icons = {
    Search, ChevronDown, MoreVertical, Eye, ArrowUp,
    Trash2, Building2, ChevronLeft, ChevronRight, Ban,
  };

  // =========================
  // REACTIVE FORM (FILTERS)
  // =========================
  filterForm: FormGroup = this.fb.group({
    searchQuery:  [''],
    planFilter:   [''],
    statusFilter: [''],
  });

  // =========================
  // STATE (SIGNALS)
  // =========================
  companies            = signal<CompanyItem[]>([]); // all companies
  loading              = signal(true);              // loading state
  openMenuId           = signal<string | null>(null); // opened action menu
  planSubmenuCompanyId = signal<string | null>(null); // plan submenu state
  menuAnchor           = signal<{ top: number; left: number; flipAbove: boolean } | null>(null);

  // pagination state
  currentPage = signal(1);
  pageSize    = signal(10);

  // filter signals (synced with form)
  private searchQuery  = signal('');
  private planFilter   = signal('');
  private statusFilter = signal('');

  // available plans list
  readonly plans = [...COMPANY_PLANS];

  // =========================
  // COMPUTED VALUES
  // =========================

  /**
   * currently selected company (for menu actions)
   */
  openMenuCompany = computed(() => {
    const id = this.openMenuId();
    if (!id) return null;
    return this.companies().find((c) => c._id === id) ?? null;
  });

  /**
   * filtered companies based on:
   * - search query
   * - plan filter
   * - status filter
   */
  filteredCompanies = computed(() => {
    const q      = this.searchQuery().toLowerCase();
    const plan   = this.planFilter();
    const status = this.statusFilter();

    return this.companies().filter((c) => {
      if (c.role !== 'company') return false;

      const name = this.getName(c).toLowerCase();

      if (q && !name.includes(q) && !c.email.toLowerCase().includes(q)) return false;
      if (plan && c.plan !== plan) return false;

      if (status === 'active'  && c.isBlocked)  return false;
      if (status === 'blocked' && !c.isBlocked) return false;

      return true;
    });
  });

  /**
   * pagination slice of filtered data
   */
  paginatedCompanies = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredCompanies().slice(start, start + this.pageSize());
  });

  /**
   * pagination helpers
   */
  totalPages  = computed(() => Math.ceil(this.filteredCompanies().length / this.pageSize()));
  pageNumbers = computed(() =>
    Array.from({ length: this.totalPages() }, (_, i) => i + 1)
  );

  // =========================
  // LIFECYCLE
  // =========================

  constructor() {
    /**
     * React to filter changes and reset pagination automatically
     */
    effect(() => {
      this.searchQuery();
      this.planFilter();
      this.statusFilter();
      this.resetPagination();
    });
  }

  ngOnInit(): void {
    /**
     * Load companies from backend
     */
    this.companyService.getAllCompanies().subscribe({
      next: (res) => {
        this.companies.set(res.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    /**
     * Sync reactive form with signals
     */
    this.filterForm.valueChanges.subscribe((vals) => {
      this.searchQuery.set(vals.searchQuery  ?? '');
      this.planFilter.set(vals.planFilter    ?? '');
      this.statusFilter.set(vals.statusFilter ?? '');
    });
  }

  // =========================
  // HELPER FUNCTIONS
  // =========================

  /** return company display name */
  getName(c: CompanyItem): string {
    if (!c.name) return '—';
    if (typeof c.name === 'string') return c.name;
    return c.name.en || c.name.ar || '—';
  }

  /** generate initials for avatar */
  getInitials(c: CompanyItem): string {
    return this.getName(c)
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  /** calculate token usage percentage */
  getTokenPct(c: CompanyItem): number {
    if (!c.maxToken) return 0;
    return Math.round((c.tokenUsage / c.maxToken) * 100);
  }

  /** format large numbers (e.g. 1200 -> 1.2k) */
  formatTokens(n: number): string {
    return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n);
  }

  // =========================
  // UI COLORS
  // =========================
  readonly avatarColors = [
    { bg: 'bg-violet-100', text: 'text-violet-700' },
    { bg: 'bg-cyan-100',   text: 'text-cyan-700' },
    { bg: 'bg-indigo-100',  text: 'text-indigo-700' },
    { bg: 'bg-amber-100',   text: 'text-amber-700' },
    { bg: 'bg-pink-100',    text: 'text-pink-700' },
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

    this.menuAnchor.set(
      this.computeMenuAnchor(event.currentTarget as HTMLElement)
    );
  }

  closeMenu(): void {
    this.openMenuId.set(null);
    this.planSubmenuCompanyId.set(null);
    this.menuAnchor.set(null);
  }

  /** close menu when clicking outside */
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

  /** close menu on resize */
  @HostListener('window:resize')
  onWindowResize(): void {
    if (this.openMenuId()) this.closeMenu();
  }

  /**
   * calculate menu position dynamically
   */
  private computeMenuAnchor(trigger: HTMLElement) {
    const rect = trigger.getBoundingClientRect();

    const menuWidth  = 200;
    const estimatedH = 180;
    const gap        = 6;

    let left = rect.right - menuWidth;
    left = Math.max(8, Math.min(left, window.innerWidth - menuWidth - 8));

    const spaceBelow = window.innerHeight - rect.bottom;
    const flipAbove  = spaceBelow < estimatedH && rect.top > estimatedH;

    const top = flipAbove
      ? rect.top - gap
      : rect.bottom + gap;

    return { top, left, flipAbove };
  }

  togglePlanSubmenu(companyId: string, event: Event): void {
    event.stopPropagation();

    this.planSubmenuCompanyId.set(
      this.planSubmenuCompanyId() === companyId ? null : companyId
    );
  }

  // =========================
  // BUSINESS ACTIONS
  // =========================

  /**
   * block / unblock company with confirmation dialog
   */
  toggleBlockStatus(company: CompanyItem): void {
    const isBlocking = !company.isBlocked;

    const dialogRef = this.dialog.open(CompanyConfirmDialogComponent, {
      width: '420px',
      panelClass: COMPANIES_DIALOG_PANEL,
      data: {
        title: isBlocking ? 'Block company' : 'Unblock company',
        message: isBlocking
          ? `Are you sure you want to block ${this.getName(company)}?`
          : `Are you sure you want to unblock ${this.getName(company)}?`,
        confirmLabel: isBlocking ? 'Block' : 'Unblock',
        confirmDanger: isBlocking,
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;

      const request = isBlocking
        ? this.companyService.blockCompany(company._id)
        : this.companyService.unblockCompany(company._id);

      request.subscribe({
        next: () => {
          this.companies.update((list) =>
            list.map((c) =>
              c._id === company._id
                ? { ...c, isBlocked: isBlocking }
                : c
            )
          );

          this.closeMenu();
        },
      });
    });
  }

  /**
   * delete company permanently
   */
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
          this.companies.update((list) =>
            list.filter((x) => x._id !== id)
          );
          this.closeMenu();
        },
      });
    });
  }

  /**
   * change company subscription plan
   */
  requestPlanChange(c: CompanyItem, plan: string, event?: Event): void {
    event?.stopPropagation();

    if (plan === c.plan) return;

    this.closeMenu();

    const dialogRef = this.dialog.open(CompanyPlanUpdateDialogComponent, {
      width: '420px',
      panelClass: COMPANIES_DIALOG_PANEL,
      data: {
        company: {
          name: this.getName(c),
          email: c.email,
          plan: c.plan,
        },
        newPlan: plan,
        isEnterprise: plan === 'Enterprise',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;

      this.companyService.updateCompanyPlan(c._id, plan).subscribe({
        next: () =>
          this.companies.update((list) =>
            list.map((x) =>
              x._id === c._id ? { ...x, plan } : x
            )
          ),
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
