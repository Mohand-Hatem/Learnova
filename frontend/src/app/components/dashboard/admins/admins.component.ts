import {
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import {
  LucideAngularModule,
  ShieldCheck,
  Search,
  Mail,
  Calendar,
  RefreshCw,
  UserX,
  FileText,
  FileX,
  ChevronRight,
} from 'lucide-angular';
import { AdminService } from '../../../services/admin.service';

@Component({
  selector: 'app-admins',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './admins.component.html',
})
export class AdminsComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly router       = inject(Router);

  readonly allUsers  = signal<any[]>([]);
  readonly loading   = signal(true);
  readonly error     = signal('');
  readonly search    = signal('');

  readonly icons = {
    ShieldCheck, Search, Mail, Calendar, RefreshCw, UserX,
    FileText, FileX, ChevronRight,
  };

  readonly admins = computed(() => {
    const q = this.search().trim().toLowerCase();
    return this.allUsers()
      .filter((u) => u.role === 'admin')
      .filter((u) => {
        if (!q) return true;
        const name = this.getName(u).toLowerCase();
        return name.includes(q) || (u.email ?? '').toLowerCase().includes(q);
      });
  });

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
      },
      error: () => {
        this.error.set('Failed to load admins. Please try again.');
        this.loading.set(false);
      },
    });
  }

  openDetail(id: string): void {
    this.router.navigate(['/dashboard/admins', id]);
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
}
