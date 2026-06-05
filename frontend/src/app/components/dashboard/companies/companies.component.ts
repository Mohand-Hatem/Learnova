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
export class CompaniesComponent implements OnInit {
  Math = Math;

  readonly ui = {
    card:        COMPANIES_CARD,
    input:       COMPANIES_INPUT,
    menu:        COMPANIES_MENU_FIXED,
    menuItem:    COMPANIES_MENU_ITEM,
    planSubmenu: COMPANIES_PLAN_SUBMENU,
  };

  readonly planBadgeClass   = companyPlanBadgeClass;
  readonly statusBadgeClass = companyStatusBadgeClass;

  private companyService = inject(CompanyService);
  private dialog         = inject(MatDialog);
  private fb             = inject(FormBuilder);

  icons = {
    Search, ChevronDown, MoreVertical, Eye, ArrowUp,
    Trash2, Building2, ChevronLeft, ChevronRight, Ban,
  };

  filterForm: FormGroup = this.fb.group({
    searchQuery:  [''],
    planFilter:   [''],
    statusFilter: [''],
  });

  companies            = signal<CompanyItem[]>([]);
  loading              = signal(true);
  openMenuId           = signal<string | null>(null);
  planSubmenuCompanyId = signal<string | null>(null);
  menuAnchor           = signal<{ top: number; left: number; flipAbove: boolean } | null>(null);

  currentPage = signal(1);
  pageSize    = signal(10);

  readonly plans = [...COMPANY_PLANS];

  private searchQuery  = signal('');
  private planFilter   = signal('');
  private statusFilter = signal('');

  openMenuCompany = computed(() => {
    const id = this.openMenuId();
    if (!id) return null;
    return this.companies().find((c) => c._id === id) ?? null;
  });

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

  paginatedCompanies = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredCompanies().slice(start, start + this.pageSize());
  });

  totalPages  = computed(() => Math.ceil(this.filteredCompanies().length / this.pageSize()));
  pageNumbers = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));

  constructor() {
    effect(() => {
      this.searchQuery(); this.planFilter(); this.statusFilter();
      this.resetPagination();
    });
  }

  ngOnInit(): void {
    this.companyService.getAllCompanies().subscribe({
      next:  (res) => { this.companies.set(res.data); this.loading.set(false); },
      error: ()    => this.loading.set(false),
    });

    this.filterForm.valueChanges.subscribe((vals) => {
      this.searchQuery.set(vals.searchQuery  ?? '');
      this.planFilter.set(vals.planFilter    ?? '');
      this.statusFilter.set(vals.statusFilter ?? '');
    });
  }


  getName(c: CompanyItem): string {
    if (!c.name) return '—';
    if (typeof c.name === 'string') return c.name;
    return c.name.en || c.name.ar || '—';
  }

  getInitials(c: CompanyItem): string {
    return this.getName(c).split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  }

  getTokenPct(c: CompanyItem): number {
    if (!c.maxToken) return 0;
    return Math.round((c.tokenUsage / c.maxToken) * 100);
  }

  formatTokens(n: number): string {
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return String(n);
  }

  readonly avatarColors = [
    { bg: 'bg-violet-100 dark:bg-violet-500/20', text: 'text-violet-700 dark:text-violet-300' },
    { bg: 'bg-cyan-100 dark:bg-cyan-500/20',     text: 'text-cyan-700 dark:text-cyan-300' },
    { bg: 'bg-indigo-100 dark:bg-indigo-500/20', text: 'text-indigo-700 dark:text-indigo-300' },
    { bg: 'bg-amber-100 dark:bg-amber-500/20',   text: 'text-amber-700 dark:text-amber-300' },
    { bg: 'bg-pink-100 dark:bg-pink-500/20',     text: 'text-pink-700 dark:text-pink-300' },
  ];

  getAvatarColor(index: number) {
    return this.avatarColors[index % this.avatarColors.length];
  }

  toggleMenu(id: string, event: Event): void {
    event.stopPropagation();
    if (this.openMenuId() === id) { this.closeMenu(); return; }
    this.planSubmenuCompanyId.set(null);
    this.openMenuId.set(id);
    this.menuAnchor.set(this.computeMenuAnchor(event.currentTarget as HTMLElement));
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
    if (t.closest('[data-companies-menu]') || t.closest('[data-companies-menu-trigger]')) return;
    this.closeMenu();
  }

  @HostListener('window:resize')
  onWindowResize(): void { if (this.openMenuId()) this.closeMenu(); }

  private computeMenuAnchor(trigger: HTMLElement) {
    const rect       = trigger.getBoundingClientRect();
    const menuWidth  = 200;
    const estimatedH = 180;
    const gap        = 6;
    let left = rect.right - menuWidth;
    left = Math.max(8, Math.min(left, window.innerWidth - menuWidth - 8));
    const spaceBelow = window.innerHeight - rect.bottom;
    const flipAbove  = spaceBelow < estimatedH && rect.top > estimatedH;
    const top        = flipAbove ? rect.top - gap : rect.bottom + gap;
    return { top, left, flipAbove };
  }

  togglePlanSubmenu(companyId: string, event: Event): void {
    event.stopPropagation();
    this.planSubmenuCompanyId.set(
      this.planSubmenuCompanyId() === companyId ? null : companyId,
    );
  }


  toggleBlockStatus(company: CompanyItem): void {
     console.log('clicked', company);
    const isBlocking = !company.isBlocked;

    const dialogRef = this.dialog.open(CompanyConfirmDialogComponent, {
      width: '420px',
      panelClass: COMPANIES_DIALOG_PANEL,
      data: {
        title:        isBlocking ? 'Block company'   : 'Unblock company',
        message:      isBlocking
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
              c._id === company._id ? { ...c, isBlocked: isBlocking } : c,
            ),
          );
          this.closeMenu();
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
        title:        'Delete company',
        message:      c
          ? `Are you sure you want to delete ${this.getName(c)}? This action cannot be undone.`
          : 'Are you sure you want to delete this company? This action cannot be undone.',
        confirmLabel:  'Delete',
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
        company:      { name: this.getName(c), email: c.email, plan: c.plan },
        newPlan:      plan,
        isEnterprise: plan === 'Enterprise',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.companyService.updateCompanyPlan(c._id, plan).subscribe({
        next: () =>
          this.companies.update((list) =>
            list.map((x) => (x._id === c._id ? { ...x, plan } : x)),
          ),
      });
    });
  }

  
  goToPage(page: number): void { if (page >= 1 && page <= this.totalPages()) this.currentPage.set(page); }
  nextPage(): void { if (this.currentPage() < this.totalPages()) this.currentPage.update((p) => p + 1); }
  prevPage(): void { if (this.currentPage() > 1) this.currentPage.update((p) => p - 1); }
  resetPagination(): void { this.currentPage.set(1); }
}
