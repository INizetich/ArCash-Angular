import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth-service/auth-service';

export const homeGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    // If the user is logged in, redirect them to the dashboard
    return router.parseUrl('/dashboard');
  } else {
    // If the user is not logged in, allow access to the home page
    return true;
  }
};
