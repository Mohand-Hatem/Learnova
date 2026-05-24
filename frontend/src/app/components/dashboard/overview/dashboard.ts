import { Component, inject, OnInit } from '@angular/core';
import { StatCardComponent } from './components/stat-card/stat-card';
import { PlatformActivityChart } from './components/platform-activity-chart/platform-activity-chart';
import { SkillsBarChart } from './components/skills-bar-chart/skills-bar-chart';
import { RecentCvsTable } from './components/recent-cvs-table/recent-cvs-table';
import { AiHealthPanel } from './components/ai-health-panel/ai-health-panel';
import {
  type AiHealthItem,
  type PlatformActivity,
  type RecentCv,
  type SkillItem,
  type StatCard,
} from './dashboard.models';
import { DashboardService } from '../../core/services/dashboard.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    StatCardComponent,
    PlatformActivityChart,
    SkillsBarChart,
    RecentCvsTable,
    AiHealthPanel,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private readonly dashboardService = inject(DashboardService);

  readonly stats = this.dashboardService.stats;
  readonly recentCvs = this.dashboardService.recentCvs;
  readonly topSkills = this.dashboardService.topSkills;
  readonly platformActivity = this.dashboardService.platformActivity;
  readonly aiHealth = this.dashboardService.aiHealth;
  readonly userName = this.dashboardService.userName;
  readonly loading = this.dashboardService.loading;
  readonly isLive = this.dashboardService.isLive;
  readonly loadError = this.dashboardService.loadError;
  readonly sources = this.dashboardService.sources;

  ngOnInit(): void {
    this.dashboardService.load();
  }
}
