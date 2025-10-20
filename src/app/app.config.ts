import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http'; // <-- 1. IMPORTA 'withInterceptors'

import { routes } from './app.routes';
import { jwtInterceptor } from './core/interceptors/jwt-interceptor';
 // <-- 2. IMPORTA TU INTERCEPTOR (ajustá la ruta si lo pusiste en otra carpeta)

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    
    // V--- 3. ACÁ ESTÁ EL CAMBIO ---V
    // Le decís a HttpClient que use tu interceptor para todas las peticiones
    provideHttpClient(
      withInterceptors([jwtInterceptor])
    )
    // ^--------------------------^
  ]
};