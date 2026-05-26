import {
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { startWith } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { CompanyService } from '../../../services/company.service';
import { Company, CompanyPlan, CompanyStatus } from '../../../models/company.model';

@Component({
  selector: 'app-companies',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './companies.component.html',
})
export class CompaniesComponent implements OnInit {
  private readonly companyService = inject(CompanyService);
  private readonly router         = inject(Router);

  private readonly allCompanies = signal<Company[]>([]);
  readonly openMenuId           = signal<string | null>(null);


  readonly filters = new FormGroup({
    search: new FormControl('',                            { nonNullable: true }),
    plan:   new FormControl<CompanyPlan | 'All'>('All',   { nonNullable: true }),
    status: new FormControl<CompanyStatus | 'All'>('All', { nonNullable: true }),
  });

  readonly plans:    (CompanyPlan | 'All')[]   = ['All', 'Free', 'Pro', 'Enterprise'];
  readonly statuses: (CompanyStatus | 'All')[] = ['All', 'Active', 'Banned'];


  private readonly filtersSignal = signal(this.filters.getRawValue());

  readonly filteredCompanies = computed(() => {
    const { search, plan, status } = this.filtersSignal();
    const q = search.toLowerCase().trim();

    return this.allCompanies().filter(c => {
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q);
      const matchesPlan   = plan   === 'All' || c.plan   === plan;
      const matchesStatus = status === 'All' || c.status === status;
      return matchesSearch && matchesPlan && matchesStatus;
    });
  });

  constructor() {
    this.filters.valueChanges
      .pipe(
        startWith(this.filters.getRawValue()),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.filtersSignal.set(this.filters.getRawValue()));
  }

  ngOnInit(): void {
    this.companyService.getCompanies().subscribe(data => {
      this.allCompanies.set(data);
    });
  }

  formatTokens(value: number): string {
    return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : `${value}`;
  }

  getTokenPercent(company: Company): number {
    return Math.round((company.tokensUsed / company.tokensLimit) * 100);
  }

  toggleMenu(id: string, event: MouseEvent): void {
    event.stopPropagation();
    this.openMenuId.set(this.openMenuId() === id ? null : id);
  }

  closeMenu(): void {
    this.openMenuId.set(null);
  }

  viewDetails(id: string): void {
    this.router.navigate(['/dashboard/company-details', id]);
    this.closeMenu();
  }

  upgradePlan(company: Company): void {
    console.log('Upgrade plan for:', company.name);
    this.closeMenu();
  }

  banCompany(id: string): void {
    const company = this.allCompanies().find(c => c.id === id);
    if (!company) return;

    const newStatus: CompanyStatus = company.status === 'Banned' ? 'Active' : 'Banned';

    this.companyService.updateStatus(id, newStatus).subscribe(() => {
      this.allCompanies.update(list =>
        list.map(c => (c.id === id ? { ...c, status: newStatus } : c)),
      );
    });
    this.closeMenu();
  }

  deleteCompany(id: string): void {
    this.companyService.deleteCompany(id).subscribe(() => {
      this.allCompanies.update(list => list.filter(c => c.id !== id));
    });
    this.closeMenu();
  }

  exportCompanies(): void {
    const rows = [
      'Name,Email,Plan,Searches,Tokens Used,Tokens Limit,Status,Last Activity',
      ...this.filteredCompanies().map(c =>
        `"${c.name}","${c.email}","${c.plan}",${c.searches},` +
        `${c.tokensUsed},${c.tokensLimit},"${c.status}","${c.lastActivity}"`,
      ),
    ].join('\n');

    const url = URL.createObjectURL(new Blob([rows], { type: 'text/csv' }));
    Object.assign(document.createElement('a'), {
      href: url,
      download: 'companies.csv',
    }).click();
    URL.revokeObjectURL(url);
  }

  getPlanClasses(plan: CompanyPlan): string {
    const map: Record<CompanyPlan, string> = {
      Enterprise: 'bg-slate-800 text-white',
      Pro:        'border border-blue-400 text-blue-600 bg-blue-50',
      Free:       'border border-gray-300 text-gray-500 bg-white',
    };
    return map[plan];
  }

  getStatusClasses(status: CompanyStatus): string {
    return status === 'Active'
      ? 'bg-emerald-50 text-emerald-700'
      : 'bg-red-50 text-red-600';
  }

  getStatusDotClass(status: CompanyStatus): string {
    return status === 'Active' ? 'bg-emerald-500' : 'bg-red-500';
  }
}
