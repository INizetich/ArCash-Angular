import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ResendResponse {
  success: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class ResendService {
  private apiUrl = 'http://localhost:8080';

  constructor(private http: HttpClient) {}

  /**
   * Reenvía el enlace de validación de email
   * @param email Email del usuario
   * @returns Observable con la respuesta del servidor
   */
  resendValidationEmail(email: string): Observable<ResendResponse> {
    const params = { email };
    return this.http.post<ResendResponse>(`${this.apiUrl}/api/resend/validation`, null, { params });
  }

  /**
   * Reenvía el enlace de recuperación de contraseña
   * @param email Email del usuario
   * @returns Observable con la respuesta del servidor
   */
  resendPasswordRecovery(email: string): Observable<ResendResponse> {
    const params = { email };
    return this.http.post<ResendResponse>(`${this.apiUrl}/api/resend/password-recovery`, null, { params });
  }
}
