import { HttpInterceptorFn, HttpErrorResponse, HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../../services/auth-service/auth-service';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError, BehaviorSubject, filter, take, Observable } from 'rxjs';

// Variables globales para el estado de refresh
let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Lista de endpoints públicos que no requieren autenticación
  const publicEndpoints = [
    '/auth/login',
    '/auth/send-recover-mail',
    '/auth/reset-password',
    '/user/create'
  ];

  // Verificar si la URL actual es un endpoint público
  const isPublicEndpoint = publicEndpoints.some(endpoint => 
    req.url.includes(endpoint)
  );

  // Si es un endpoint público, no agregamos el token
  if (isPublicEndpoint) {
    return next(req);
  }

  // Obtenemos el token desde localStorage
  const token = localStorage.getItem('JWT');

  // Si no hay token, dejamos que la petición siga su camino sin modificarla
  if (!token) {
    return next(req);
  }

  // Si hay token, clonamos la petición y le agregamos el header
  const reqConToken = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });

  // Dejamos que la petición clonada continúe
  return next(reqConToken).pipe(
    catchError((error: HttpErrorResponse) => {
      // Si el error es 498 (Token expirado) y no es una request de refresh
      if (error.status === 498 && !req.url.includes('/auth/refresh')) {
        return handle498Error(reqConToken, next, authService, router);
      }
      
      // Si el error es 401 (No autorizado) - token inválido
      if (error.status === 401 && !req.url.includes('/auth/refresh')) {
        // Verificar si es un error de creación de admin (conflict) que devuelve 401 por el constraint
        if (req.url.includes('/admin/users/create-admin')) {
          // No hacer logout, simplemente propagar el error
          return throwError(() => error);
        }
        return handle401Error(authService, router, error);
      }

      // Para errores 409 (Conflict) - duplicados, no hacer logout
      if (error.status === 409) {
        return throwError(() => error);
      }

      return throwError(() => error);
    })
  );
};

// Función para manejar error 498 (Token expirado)
function handle498Error(
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
  authService: AuthService,
  router: Router
): Observable<HttpEvent<unknown>> {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    return authService.refreshToken().pipe(
      switchMap((response: any) => {
        isRefreshing = false;
        
        const newToken = response.accessToken;
        localStorage.setItem('JWT', newToken);
        refreshTokenSubject.next(newToken);
        
        // Reintentar la request original con el nuevo token
        const newRequest = request.clone({
          setHeaders: {
            Authorization: `Bearer ${newToken}`
          }
        });
        
        return next(newRequest);
      }),
      catchError((error: any) => {
        isRefreshing = false;
        
        // Si el refresh falla, hacer logout completo
        handleFullLogout(authService, router);
        return throwError(() => error);
      })
    );
  } else {
    // Si ya se está refrescando, esperar a que termine
    return refreshTokenSubject.pipe(
      filter(token => token !== null),
      take(1),
      switchMap(token => {
        // Reintentar la request original con el nuevo token
        const newRequest = request.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`
          }
        });
        return next(newRequest);
      })
    );
  }
}

// Función para manejar error 401 (No autorizado)
function handle401Error(authService: AuthService, router: Router, error: any): Observable<never> {
  handleFullLogout(authService, router);
  return throwError(() => error);
}

// Función para logout completo (limpia localStorage y hace logout en backend)
function handleFullLogout(authService: AuthService, router: Router): void {
  // Primero intentar hacer logout en el backend para invalidar el refresh token
  authService.logoutUser().subscribe({
    next: () => {
      console.log('Logout exitoso en backend');
    },
    error: (err) => {
      console.warn('Error al hacer logout en backend:', err);
    },
    complete: () => {
      // Limpiar sesión local independientemente del resultado del logout
      authService.clearLocalSession();
      router.navigate(['/login']);
    }
  });
}