import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { User, ApiResponse, LoginData } from '../models/user.model';
import { Observable, of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  currentUser = signal<User | null>(null);
  isInitialized = signal<boolean>(false);
  isLoggedIn = computed(() => !!this.currentUser());
  isAdmin = computed(() => this.currentUser()?.role === 'admin');

  login(loginData: LoginData): Observable<ApiResponse> {
    return this.http
      .post<ApiResponse>(`${environment.apiUrl}/auth/login`, loginData, {
        withCredentials: true,
      })
      .pipe(
        tap((response) => {
          this.currentUser.set(response?.data?.user);
        }),
      );
  }

  logout() {
    return this.http.post(`${environment.apiUrl}/auth/logout`, {}, { withCredentials: true }).pipe(
      tap(() => {
        this.currentUser.set(null);
        this.router.navigate(['/login']);
      }),
    );
  }

  refresh() {
    return this.http
      .post<ApiResponse>(`${environment.apiUrl}/auth/refresh`, {}, { withCredentials: true })
      .pipe(tap((res) => this.currentUser.set(res.data.user)));
  }

  getMe() {
    return this.http
      .get<ApiResponse>(`${environment.apiUrl}/auth/me`, { withCredentials: true })
      .pipe(tap((res) => this.currentUser.set(res.data.user)));
  }
  initializeAuth(): Observable<unknown> {
    return this.getMe().pipe(
      catchError(() => of(null)),
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
