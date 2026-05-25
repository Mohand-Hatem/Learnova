import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
  LucideAngularModule,
  LayoutDashboard,
  Users,
  Building2,
  FileText,
  BarChart3,
  Activity,
  Settings,
  X,
} from 'lucide-angular';
import { NAV_ITEMS } from '../overview/dashboard.models';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, LucideAngularModule],
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.scss'],
  host: {
    class: 'app-sidebar',
    '[class.app-sidebar--open]': 'open()',
  },
})
export class Sidebar {
  readonly open = input(false);
  readonly closeRequested = output<void>();
  readonly navItems = NAV_ITEMS;
  readonly icons = { X, LayoutDashboard, Users, Building2, FileText, BarChart3, Activity, Settings };

  readonly iconMap: Record<string, any> = {
    'layout-dashboard': LayoutDashboard,
    users: Users,
    'building-2': Building2,
    'file-text': FileText,
    'bar-chart-3': BarChart3,
    activity: Activity,
    settings: Settings,
  };

  iconClass(route: string): any {
    const item = NAV_ITEMS.find((n) => n.route === route);
    return this.iconMap[item?.icon ?? 'layout-dashboard'] ?? LayoutDashboard;
  }

  onNavClick(): void {
    this.closeRequested.emit();
  }
}
