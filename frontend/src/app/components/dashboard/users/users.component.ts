import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
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
} from 'lucide-angular';
import { environment } from '../../../../environments/environment';
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
  cvs?: { atsScore: number }[];
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, RouterModule],
  templateUrl: './users.component.html',
})
export class UsersComponent implements OnInit {
  private http = inject(HttpClient);

  icons = {
    Search, ChevronDown, MoreVertical, Eye, FileText,
    ArrowUp, Ban, Trash2, X, User, CreditCard,
    Calendar, Activity, Zap,
  };

  users = signal<UserItem[]>([]);
  loading = signal(true);
  searchQuery = signal('');
  planFilter = signal('');
  atsFilter = signal('');
  typeFilter = signal('');
  openMenuId = signal<string | null>(null);
  selectedUser = signal<UserItem | null>(null);

  plans = ['Free', 'Pro', 'Enterprise'];

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

  ngOnInit() {
    this.http
      .get<{ success: boolean; data: UserItem[] }>(
        `${environment.apiUrl}/admin/all`,
        { withCredentials: true }
      )
      .subscribe({
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
    { bg: 'bg-indigo-100', text: 'text-indigo-700' },
    { bg: 'bg-teal-100', text: 'text-teal-700' },
    { bg: 'bg-blue-100', text: 'text-blue-700' },
    { bg: 'bg-amber-100', text: 'text-amber-700' },
    { bg: 'bg-pink-100', text: 'text-pink-700' },
  ];

  getAvatarColor(index: number) {
    return this.avatarColors[index % this.avatarColors.length];
  }

  toggleMenu(id: string) {
    this.openMenuId.set(this.openMenuId() === id ? null : id);
  }

  closeMenu() {
    this.openMenuId.set(null);
  }

  openDetail(u: UserItem) {
    this.selectedUser.set(u);
    this.closeMenu();
  }

  closeDetail() {
    this.selectedUser.set(null);
  }

  deleteUser(id: string) {
    if (!confirm('Are you sure you want to delete this user?')) return;
    this.http
      .delete(`${environment.apiUrl}/admin/user/${id}`, { withCredentials: true })
      .subscribe({
        next: () => {
          this.users.update((list) => list.filter((u) => u._id !== id));
          this.closeDetail();
        },
      });
  }

  upgradePlan(u: UserItem) {
    const idx = this.plans.indexOf(u.plan);
    const next = this.plans[idx + 1];
    if (!next) return;
    this.http
      .put(
        `${environment.apiUrl}/admin/user/${u._id}/plan`,
        { plan: next },
        { withCredentials: true }
      )
      .subscribe({
        next: () => {
          this.users.update((list) =>
            list.map((x) => (x._id === u._id ? { ...x, plan: next } : x))
          );
          if (this.selectedUser()?._id === u._id) {
            this.selectedUser.update((s) => (s ? { ...s, plan: next } : s));
          }
        },
      });
  }
}
