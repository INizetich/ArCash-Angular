import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

interface ValidationResponse {
  success: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class ValidationService {
  
  private baseUrl = 'http://localhost:8080';
  
  constructor(private http: HttpClient) {}

  /**
   * Valida un token de activación de cuenta nueva
   * @param token Token de validación
   * @returns Observable con la respuesta JSON
   */
  validateEmailToken(token: string): Observable<ValidationResponse> {
    return this.http.get<ValidationResponse>(`${this.baseUrl}/validate?token=${token}`);
  }
}

export type { ValidationResponse };
