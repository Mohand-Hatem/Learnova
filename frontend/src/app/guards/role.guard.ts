import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, firstValueFrom } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router      = inject(Router);

  // Wait for the app-initializer (initializeAuth) to finish before checking
  if (!authService.isInitialized()) {
    await firstValueFrom(
      toObservable(authService.isInitialized).pipe(filter(Boolean)),
    );
  }

  if (authService.isAdmin()) return true;

  router.navigate(['/login']);
  return false;
};
