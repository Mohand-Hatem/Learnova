import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Sidebar } from './sidebar/sidebar';
import { ThemeService } from '../../services/theme.service';
import { LucideAngularModule, Moon, Sun } from 'lucide-angular';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule, Sidebar, LucideAngularModule],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent {
  themeService = inject(ThemeService);
  private authService = inject(AuthService);
  private router = inject(Router);
  icons = { Moon, Sun };

  logout() {
    this.authService.logout().subscribe({
      complete: () => this.router.navigate(['/login']),
    });
  }
}
