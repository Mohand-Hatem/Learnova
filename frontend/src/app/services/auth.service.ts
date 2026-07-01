import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { User, ApiResponse, LoginData } from '../models/user.model';
import { Observable, of } from 'rxjs';
import { SessionNotificationsService } from './session-notifications.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private sessionNotifications = inject(SessionNotificationsService);

  currentUser = signal<User | null>(null);
  isInitialized = signal<boolean>(false);
  isLoggedIn = computed(() => !!this.currentUser());
  isAdmin = computed(() => this.currentUser()?.role === 'admin');

  private setAuthenticatedUser(response: ApiResponse | null | undefined): void {
    const payload = response as (ApiResponse & { user?: User | null }) | null | undefined;
    const user = payload?.data?.user ?? payload?.user ?? null;
    this.currentUser.set(user);
  }

  login(loginData: LoginData): Observable<ApiResponse> {
    return this.http
      .post<ApiResponse>(`${environment.apiUrl}/auth/login`, loginData, {
        withCredentials: true,
      })
      .pipe(
        tap((response) => {
          this.setAuthenticatedUser(response);
        }),
      );
  }

  logout() {
    // Clear user immediately so guards and interceptor see logged-out state at once
    this.currentUser.set(null);
    // Session notifications should survive refresh, but not logout.
    this.sessionNotifications.clear();
    return this.http.post(`${environment.apiUrl}/auth/logout`, {}, { withCredentials: true }).pipe(
      tap(() => this.router.navigate(['/login'])),
      catchError(() => {
        this.router.navigate(['/login']);
        return of(null);
      }),
    );
  }

  refresh() {
    return this.http
      .post<ApiResponse>(`${environment.apiUrl}/auth/refresh`, {}, { withCredentials: true })
      .pipe(tap((res) => this.setAuthenticatedUser(res)));
  }

  getMe() {
    return this.http
      .get<ApiResponse>(`${environment.apiUrl}/auth/me`, { withCredentials: true })
      .pipe(tap((res) => this.setAuthenticatedUser(res)));
  }

  initializeAuth(): Observable<unknown> {
    return this.getMe().pipe(
      catchError((error) => {
        if (error?.status === 401 || error?.status === 403) {
          return this.refresh().pipe(
            catchError(() => {
              this.currentUser.set(null);
              return of(null);
            }),
          );
        }

        this.currentUser.set(null);
        return of(null);
      }),
      tap(() => this.isInitialized.set(true)),
    );
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/auth/forgot-password`, { email });
  }

  verifyOtp(data: { email: string; otp: string }): Observable<any> {
    return this.http.post(`${environment.apiUrl}/auth/verify-otp`, data);
  }

  resetPassword(data: { email: string; otp: string; newPassword: string }): Observable<any> {
    return this.http.post(`${environment.apiUrl}/auth/reset-password`, data);
  }
}
