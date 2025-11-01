import { HttpInterceptorFn } from '@angular/common/http';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
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
  return next(reqConToken);
};