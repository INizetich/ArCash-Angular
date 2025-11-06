import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../enviroments/enviroment'; // <-- 1. IMPORTAR

export interface ResendResponse {
  success: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class ResendService {
  // 2. USAR LA VARIABLE DE ENTORNO
  private apiUrl = environment.apiUrl; 

  constructor(private http: HttpClient) {}

  /**
   * Reenvía el enlace de validación de email
   * @param email Email del usuario
   * @returns Observable con la respuesta del servidor
   */
  resendValidationEmail(email: string): Observable<ResendResponse> {
    const params = { email };
    // 3. APUNTAR A LA RUTA CORREGIDA (asumiendo /api/auth/)
    return this.http.post<ResendResponse>(`${this.apiUrl}/auth/resend-validation`, null, { params });
  }

  /**
   * Reenvía el enlace de recuperación de contraseña
   * @param email Email del usuario
   * @returns Observable con la respuesta del servidor
   */
  resendPasswordRecovery(email: string): Observable<ResendResponse> {
    const params = { email };
    // 3. APUNTAR A LA RUTA CORREGIDA (asumiendo /api/auth/)
    return this.http.post<ResendResponse>(`${this.apiUrl}/auth/resend-password-recovery`, null, { params });
  }
}