import {CanActivateFn, Router} from '@angular/router'
import { AuthService } from '../services/auth-service/auth-service';
import {inject} from '@angular/core';

export const authGuard: CanActivateFn = (route, state) => {

  const auth = inject(AuthService)
  const router = inject(Router)
  return auth.isLoggedIn() ? true : router.parseUrl('/login');
};
