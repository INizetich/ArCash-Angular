import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth-service/auth-service';
import { inject } from '@angular/core';

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn() && localStorage.getItem('role') === 'ADMIN') {
    return true;
  } else {
    return router.parseUrl('/dashboard');
  }
};
