import { isPlatformBrowser, CommonModule } from '@angular/common';
import { Component, DestroyRef, effect, inject, PLATFORM_ID, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { ThemeService } from '../../../services/theme.service';
import { Sidebar } from '../sidebar/sidebar';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, Sidebar],
  templateUrl: './admin-layout.html',
  styleUrls: ['./admin-layout.scss'],
})
export class AdminLayout {
  private readonly router: Router = inject(Router);
  private readonly platformId: Object = inject(PLATFORM_ID);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);
  readonly themeService: ThemeService = inject(ThemeService);
  private readonly authService: AuthService = inject(AuthService);

  readonly userName = 'Alex Ionescu';
  readonly userRole = 'Super Admin';
  readonly userInitials = 'AI';
  /** Sidebar closed by default on all screen sizes */
  readonly sidebarOpen = signal(false);

  constructor() {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.closeSidebar());

    if (isPlatformBrowser(this.platformId)) {
      effect(() => {
        document.body.style.overflow = this.sidebarOpen() ? 'hidden' : '';
      });

      this.destroyRef.onDestroy(() => {
        document.body.style.overflow = '';
      });
    }
  }

  toggleSidebar(): void {
    this.sidebarOpen.update((open) => !open);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  logout(): void {
    this.authService.logout().subscribe({
      complete: () => this.router.navigate(['/login']),
    });
  }
}
