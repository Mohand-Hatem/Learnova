import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Download, Bot } from 'lucide-angular';
import { StatCardComponent } from './components/stat-card/stat-card';
import { PlatformActivityChart } from './components/platform-activity-chart/platform-activity-chart';
import { SkillsBarChart } from './components/skills-bar-chart/skills-bar-chart';
import { RecentCvsTable } from './components/recent-cvs-table/recent-cvs-table';
import { AiHealthPanel } from './components/ai-health-panel/ai-health-panel';
import { TopPlansChart } from './components/top-plans-chart/top-plans-chart';
import { DashboardService } from '../../../services/dashboard.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    StatCardComponent,
    PlatformActivityChart,
    SkillsBarChart,
    RecentCvsTable,
    AiHealthPanel,
    TopPlansChart,
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
  host: { class: 'block w-full min-w-0 max-w-full' },
})
export class Dashboard implements OnInit {
  private readonly dashboardService = inject(DashboardService);

  readonly icons = { Download, Bot };

  readonly stats            = this.dashboardService.stats;
  readonly recentCvs        = this.dashboardService.recentCvs;
  readonly topSkills        = this.dashboardService.topSkills;
  readonly platformActivity = this.dashboardService.platformActivity;
  readonly aiHealth         = this.dashboardService.aiHealth;
  readonly topPlans         = this.dashboardService.topPlans;
  readonly topPlansTotal    = this.dashboardService.topPlansTotal;
  readonly topCompanies     = this.dashboardService.topCompanies;
  readonly aiInsight        = this.dashboardService.aiInsight;
  readonly userName         = this.dashboardService.userName;
  readonly loading          = this.dashboardService.loading;
  readonly isLive           = this.dashboardService.isLive;
  readonly loadError        = this.dashboardService.loadError;
  readonly sources          = this.dashboardService.sources;

  ngOnInit(): void {
    this.dashboardService.load();
  }

  exportReport(): void {
    const stats = this.stats();
    const skills = this.topSkills();
    const plans = this.topPlans();
    const date = new Date().toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Learnova Overview Report — ${date}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; background: #f8fafc; color: #0f172a; padding: 48px; max-width: 960px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 24px; border-bottom: 2.5px solid #4f46e5; }
    .brand { display: flex; align-items: center; gap: 12px; }
    .brand-icon { width: 40px; height: 40px; background: #4f46e5; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 800; font-size: 18px; }
    .brand-name { font-size: 22px; font-weight: 800; color: #4f46e5; }
    .brand-sub { font-size: 12px; color: #64748b; margin-top: 2px; }
    .meta { text-align: right; }
    .meta h2 { font-size: 16px; font-weight: 700; }
    .meta p { font-size: 12px; color: #64748b; margin-top: 3px; }
    .section { margin-bottom: 36px; }
    .section-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #94a3b8; margin-bottom: 14px; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0; }
    .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .stat-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px 22px; }
    .stat-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #94a3b8; margin-bottom: 10px; }
    .stat-value { font-size: 30px; font-weight: 800; color: #0f172a; line-height: 1; }
    .stat-trend { font-size: 11px; font-weight: 600; margin-top: 8px; }
    .up { color: #16a34a; } .down { color: #dc2626; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .list-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px; }
    .list-card h4 { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; margin-bottom: 14px; }
    .skill-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
    .skill-row:last-child { border-bottom: none; }
    .skill-count { font-weight: 700; color: #4f46e5; }
    .plan-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
    .plan-row:last-child { border-bottom: none; }
    .plan-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; margin-right: 8px; }
    .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; }
    .footer p { font-size: 11px; color: #94a3b8; }
    @media print { body { background: #fff; padding: 24px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <div class="brand-icon">L</div>
      <div>
        <div class="brand-name">Learnova</div>
        <div class="brand-sub">Admin Dashboard</div>
      </div>
    </div>
    <div class="meta">
      <h2>Overview Report</h2>
      <p>${date}</p>
      <p>Generated at ${time}</p>
    </div>
  </div>

  <div class="section">
    <div class="section-label">Key Metrics</div>
    <div class="stats-grid">
      ${stats.map(s => `
        <div class="stat-card">
          <div class="stat-title">${s.title}</div>
          <div class="stat-value">${s.value}</div>
          ${s.trendPercent ? `<div class="stat-trend ${s.trendUp ? 'up' : 'down'}">${s.trendUp ? '↑' : '↓'} ${s.trendPercent} from last month</div>` : ''}
        </div>
      `).join('')}
    </div>
  </div>

  <div class="two-col">
    <div class="list-card">
      <h4>Top Skills Detected</h4>
      ${skills.map(s => `
        <div class="skill-row">
          <span>${s.skill}</span>
          <span class="skill-count">${s.count.toLocaleString()}</span>
        </div>
      `).join('')}
    </div>
    <div class="list-card">
      <h4>Plan Distribution</h4>
      ${plans.map(p => `
        <div class="plan-row">
          <span><span class="plan-dot" style="background:${p.color}"></span>${p.name}</span>
          <span style="font-weight:700">${p.percentage}%</span>
        </div>
      `).join('')}
    </div>
  </div>

  <div class="footer">
    <p>Learnova Admin Dashboard — Confidential</p>
    <p>© ${new Date().getFullYear()} Learnova. All rights reserved.</p>
  </div>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=960,height=720');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 400);
    }
  }
}
