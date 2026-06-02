import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (_, state) => {
  let authService = inject(AuthService);
  let router = inject(Router);

  if (authService.isAdmin()) return true;

  router.navigate(['/login']);
  return false;
};
