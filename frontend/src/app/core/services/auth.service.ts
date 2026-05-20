import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { User, ApiResponse } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = environment.apiUrl;

  currentUser = signal<User | null>(null);
  isLoggedIn = computed(() => !!this.currentUser());
  isAdmin = computed(() => this.currentUser()?.role === 'admin');

  login(email: string, password: string) {
    return this.http
      .post<ApiResponse<{ user: User }>>(
        `${this.apiUrl}/auth/login`,
        { email, password },
        { withCredentials: true }
      )
      .pipe(tap((res) => this.currentUser.set(res.data.user)));
  }

  logout() {
    return this.http
      .post(`${this.apiUrl}/auth/logout`, {}, { withCredentials: true })
      .pipe(
        tap(() => {
          this.currentUser.set(null);
          this.router.navigate(['/login']);
        })
      );
  }

  refresh() {
    return this.http
      .post<ApiResponse<{ user: User }>>(
        `${this.apiUrl}/auth/refresh`,
        {},
        { withCredentials: true }
      )
      .pipe(tap((res) => this.currentUser.set(res.data.user)));
  }

  getMe() {
    return this.http
      .get<ApiResponse<{ user: User }>>(
        `${this.apiUrl}/auth/me`,
        { withCredentials: true }
      )
      .pipe(tap((res) => this.currentUser.set(res.data.user)));
  }
}