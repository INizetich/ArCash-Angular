import { inject } from '@angular/core';
import { CanActivateFn, ActivatedRouteSnapshot, Router } from '@angular/router';

/**
 * Guard que protege la ruta /validate para que solo sea accesible 
 * a través de enlaces de email que contengan el token de validación.
 * Si no hay token, redirige a la página 404.
 */
export const validateGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const router = inject(Router);
  
  // Verificar si existe el parámetro 'token' en la query string
  const token = route.queryParams['token'];
  
  if (!token || token.trim() === '') {
    // Si no hay token o está vacío, redirigir a 404
    console.warn('Intento de acceso directo a /validate sin token. Redirigiendo a 404.');
    router.navigate(['/404']);
    return false;
  }
  
  // Si hay token, permitir el acceso
  return true;
};
