import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

const AUTH_SKIP_URLS = ['/auth/login', '/auth/logout', '/auth/refresh', '/auth/me'];

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const isAuthUrl = AUTH_SKIP_URLS.some((u) => req.url.includes(u));

      // Only attempt token refresh when:
      // 1. It's a 401 response
      // 2. The user is currently logged in (prevents the app-init race condition)
      // 3. The failing request is not an auth endpoint itself
      if (error.status === 401 && authService.isLoggedIn() && !isAuthUrl) {
        return authService.refresh().pipe(
          switchMap(() => next(req.clone({ withCredentials: true }))),
          catchError((refreshErr) => {
            authService.logout().subscribe();
            return throwError(() => refreshErr);
          }),
        );
      }

      return throwError(() => error);
    }),
  );
};
