import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !req.url.includes('/refresh')) {
        return authService.refresh().pipe(
          switchMap(() => next(req.clone({ withCredentials: true }))),
          catchError(() => {
            authService.logout().subscribe();
            return throwError(() => error);
          }),
        );
      }
      return throwError(() => error);
    }),
  );
};
