import { HttpInterceptorFn } from '@angular/common/http';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
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