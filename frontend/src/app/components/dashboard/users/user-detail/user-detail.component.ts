import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import {
  LucideAngularModule,
  ChevronLeft, Download, ArrowUp, Ban,
  Mail, MapPin, Calendar, CheckCircle, AlertTriangle,
  Sparkles, FileText, ExternalLink,
} from 'lucide-angular';
import { environment } from '../../../../../environments/environment';

interface CV {
  _id: string;
  atsScore: number;
  processingStatus: string;
  originalFile: { url: string; fileName: string; fileType: string; fileSize?: number };
  aiAnalysis: {
    summary: string;
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
  };
  parsedData: {
    skills: string[];
    experience: { company: string; role: string; startDate: string; endDate: string }[];
    education: { university: string; degree: string; field: string }[];
  };
  createdAt: string;
  updatedAt: string;
}

interface UserDetail {
  _id: string;
  name: { en: string; ar: string } | string;
  email: string;
  role: string;
  plan: string;
  maxToken: number;
  tokenUsage: number;
  location?: string;
  isBanned?: boolean;
  createdAt: string;
  cvs: CV[];
}

@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './user-detail.component.html',
})
export class UserDetailComponent implements OnInit {
    Math = Math;
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  icons = { ChevronLeft, Download, ArrowUp, Ban, Mail, MapPin, Calendar, CheckCircle, AlertTriangle, Sparkles, FileText, ExternalLink };

  user = signal<UserDetail | null>(null);
  loading = signal(true);
  plans = ['Free', 'Pro', 'Enterprise'];

  // Mock ATS history for chart (replace with real data if available)
  atsHistory = [55, 58, 62, 64, 67, 70, 73, 75, 78, 80, 84, 87];
  atsMonths = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  // Mock token history
  tokenHistory = [320000, 580000, 410000, 920000, 1050000, 880000, 700000];
  tokenDays = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    this.http
      .get<{ success: boolean; data: UserDetail }>(
        `${environment.apiUrl}/admin/${id}`,
        { withCredentials: true }
      )
      .subscribe({
        next: (res) => { this.user.set(res.data); this.loading.set(false); },
        error: () => this.loading.set(false),
      });
  }

  getName(u: UserDetail): string {
    if (!u?.name) return '—';
    if (typeof u.name === 'string') return u.name;
    return u.name.en || u.name.ar || '—';
  }

  getInitials(u: UserDetail): string {
    return this.getName(u).split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  getLatestCV(): CV | null {
    const cvs = this.user()?.cvs;
    if (!cvs?.length) return null;
    return [...cvs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  }

  getAtsColor(score: number): string {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-error';
  }

  getAtsBarColor(score: number): string {
    if (score >= 80) return 'bg-success';
    if (score >= 60) return 'bg-warning';
    return 'bg-error';
  }

  getTokenPct(): number {
    const u = this.user();
    if (!u?.maxToken) return 0;
    return Math.min(Math.round((u.tokenUsage / u.maxToken) * 100), 100);
  }

  formatBytes(bytes?: number): string {
    if (!bytes) return '';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  timeAgo(date: string): string {
    const diff = Date.now() - new Date(date).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return '1 day ago';
    return `${days} days ago`;
  }

  formatTokens(n: number): string {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return String(n);
  }

  getRenewDate(): string {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // SVG chart helpers
  getLinePoints(data: number[], w: number, h: number): string {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    return data.map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 20) - 10;
      return `${x},${y}`;
    }).join(' ');
  }

  getAreaPoints(data: number[], w: number, h: number): string {
    const pts = this.getLinePoints(data, w, h);
    return `0,${h} ${pts} ${w},${h}`;
  }

  getRadarPoints(skills: string[], w: number): string {
    const cx = w / 2, cy = w / 2, r = w * 0.38;
    const count = Math.min(skills.length, 6);
    const pts = [];
    for (let i = 0; i < count; i++) {
      const angle = (i * 2 * Math.PI / count) - Math.PI / 2;
      // Random-ish proficiency based on skill index (replace with real scores)
      const proficiency = 0.5 + (i % 3) * 0.15;
      pts.push(`${cx + r * proficiency * Math.cos(angle)},${cy + r * proficiency * Math.sin(angle)}`);
    }
    return pts.join(' ');
  }

  getRadarBg(w: number, level: number): string {
    const cx = w / 2, cy = w / 2, r = (w * 0.38) * level;
    const count = 6;
    const pts = [];
    for (let i = 0; i < count; i++) {
      const angle = (i * 2 * Math.PI / count) - Math.PI / 2;
      pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
    }
    return pts.join(' ');
  }

  upgradePlan() {
    const u = this.user();
    if (!u) return;
    const idx = this.plans.indexOf(u.plan);
    const next = this.plans[idx + 1];
    if (!next) return;
    this.http.put(`${environment.apiUrl}/admin/user/${u._id}/plan`, { plan: next }, { withCredentials: true })
      .subscribe({ next: () => this.user.update(s => s ? { ...s, plan: next } : s) });
  }
getSkillCount(skills: string[]): number {
  return Math.min(skills?.length || 0, 6);
}
  goBack() { this.router.navigate(['/dashboard/users']); }
}
