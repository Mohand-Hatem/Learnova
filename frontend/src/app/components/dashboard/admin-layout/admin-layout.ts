import { isPlatformBrowser, CommonModule } from '@angular/common';
import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import {
  trigger,
  transition,
  style,
  animate,
  query,
} from '@angular/animations';
import { AuthService } from '../../../services/auth.service';
import { ThemeService } from '../../../services/theme.service';
import { Sidebar } from '../sidebar/sidebar';
import {
  LucideAngularModule,
  Menu, X, Search, Moon, Sun, Bell, ChevronRight,
} from 'lucide-angular';

const PAGE_LABELS: Record<string, string> = {
  overview:       'Overview',
  admins:         'Admins',
  users:          'Users',
  companies:      'Companies',
  'ai-monitoring':'AI Monitoring',
  'ai-analysis':  'AI Monitoring',
  dashboard:      'Dashboard',
};

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, Sidebar, LucideAngularModule],
  templateUrl: './admin-layout.html',
  host: { class: 'block' },
  animations: [
    trigger('routeFade', [
      transition('* <=> *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(8px)' }),
          animate('220ms cubic-bezier(0.4,0,0.2,1)',
            style({ opacity: 1, transform: 'translateY(0)' })),
        ], { optional: true }),
      ]),
    ]),
  ],
})
export class AdminLayout {
  private readonly router:      Router      = inject(Router);
  private readonly platformId:  Object      = inject(PLATFORM_ID);
  private readonly destroyRef:  DestroyRef  = inject(DestroyRef);
  readonly themeService:  ThemeService = inject(ThemeService);
  private readonly authService: AuthService = inject(AuthService);

  readonly icons = { Menu, X, Search, Moon, Sun, Bell, ChevronRight };

  readonly user     = this.authService.currentUser;

  readonly userName = computed(() => {
    const u = this.user();
    if (!u) return 'Admin';
    const name = u.name;
    if (typeof name === 'string') return name;
    return name?.en ?? 'Admin';
  });

  readonly userRole = computed(() => {
    const u = this.user();
    if (!u) return 'Admin';
    return u.role.charAt(0).toUpperCase() + u.role.slice(1);
  });

  /** Tracks the current URL so the breadcrumb can react to navigation. */
  private readonly currentUrl = signal('');

  /** Label of the active page segment (e.g. "Users", "AI Monitoring"). */
  readonly pageLabel = computed(() => {
    const url  = this.currentUrl();
    const segs = url.split('/').filter(Boolean);
    // Skip MongoDB-like IDs (24-char hex) to get the meaningful segment
    const last = [...segs].reverse().find((s) => !/^[a-f0-9]{24}$/i.test(s) && s !== 'dashboard') ?? 'overview';
    return PAGE_LABELS[last] ?? last.charAt(0).toUpperCase() + last.slice(1);
  });

  readonly sidebarOpen = signal(false);
  readonly isDesktop   = signal(false);

  constructor() {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((e) => {
        this.currentUrl.set(e.urlAfterRedirects);
        if (!this.isDesktop()) this.closeSidebarOnMobile();
      });

    if (isPlatformBrowser(this.platformId)) {
      this.currentUrl.set(this.router.url);

      const syncViewport = (isInitial = false) => {
        const desktop    = window.innerWidth >= 1024;
        const wasDesktop = this.isDesktop();
        this.isDesktop.set(desktop);

        if (isInitial) {
          this.sidebarOpen.set(desktop);
          return;
        }

        if (desktop && !wasDesktop) {
          this.sidebarOpen.set(true);
        } else if (!desktop && wasDesktop) {
          this.sidebarOpen.set(false);
        }
      };

      syncViewport(true);

      const onResize = () => syncViewport(false);
      window.addEventListener('resize', onResize);

      effect(() => {
        const lockScroll = this.sidebarOpen() && !this.isDesktop();
        document.body.style.overflow = lockScroll ? 'hidden' : '';
      });

      this.destroyRef.onDestroy(() => {
        window.removeEventListener('resize', onResize);
        document.body.style.overflow = '';
      });
    }
  }

  toggleSidebar(): void {
    this.sidebarOpen.update((open) => !open);
    this.notifyContentResize();
  }

  private notifyContentResize(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
    window.setTimeout(() => window.dispatchEvent(new Event('resize')), 320);
  }

  closeSidebarOnMobile(): void {
    if (this.isDesktop()) return;
    this.sidebarOpen.set(false);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
    this.notifyContentResize();
  }

  logout(): void {
    this.authService.logout().subscribe({
      complete: () => this.router.navigate(['/login']),
    });
  }

  /** Returns a unique value per route to trigger [@routeFade] transitions. */
  prepareRoute(outlet: RouterOutlet): string {
    return outlet?.isActivated
      ? (outlet.activatedRoute.snapshot.url.map((s) => s.path).join('/') || 'root')
      : '';
  }
}
