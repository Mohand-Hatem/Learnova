import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NAV_ITEMS } from '../overview/dashboard.models';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
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

  readonly iconMap: Record<string, string> = {
    'layout-dashboard': 'bi-grid-1x2',
    users: 'bi-people',
    'building-2': 'bi-building',
    'file-text': 'bi-file-earmark-text',
    'bar-chart-3': 'bi-bar-chart',
    activity: 'bi-activity',
    settings: 'bi-gear',
  };

  iconClass(route: string): string {
    const item = NAV_ITEMS.find((n) => n.route === route);
    return this.iconMap[item?.icon ?? 'layout-dashboard'] ?? 'bi-grid-1x2';
  }

  onNavClick(): void {
    this.closeRequested.emit();
  }
}
