import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { LoginData } from '../../models/user.model';
import {
  LucideAngularModule,
  AtSign,
  KeyRound,
  User,
  Bot,
  Search,
  Eye,
  EyeClosed,
  Moon,
  Sun,
  Info,
} from 'lucide-angular';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, LucideAngularModule],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  themeService = inject(ThemeService);
  private authService = inject(AuthService);
  private router = inject(Router);
  readonly icons = { User, Bot, Search, AtSign, KeyRound, Eye, EyeClosed, Moon, Sun, Info };

  showPassword = signal(false);
  isLoading = signal(false);
  errorMessage = signal('');

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  togglePassword() {
    this.showPassword.update((v) => !v);
  }

  onSubmit() {
    if (this.loginForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set('');
    console.log('Login form data:', this.loginForm.value);

    this.authService.login(this.loginForm.value as LoginData).subscribe({
      next: (res) => {
        console.log('Login response:', res);
        if (res.data.user.role !== 'admin') {
          console.log('Login response:', res);
          this.errorMessage.set('Access denied. Admins only.');
          this.isLoading.set(false);
          return;
        }
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Invalid email or password');
        this.isLoading.set(false);
      },
    });
  }
}
