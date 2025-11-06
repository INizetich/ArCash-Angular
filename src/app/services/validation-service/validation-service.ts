import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../enviroments/enviroment'; // <-- 1. IMPORTAR

// Mantenemos la interfaz
interface ValidationResponse {
success: boolean;
message: string;
}

@Injectable({
  providedIn: 'root'
})
export class ValidationService {

 constructor(private http: HttpClient) {}

/**
   * Valida un token de activación de cuenta nueva
   * @param token Token de validación
   * @returns Observable con la respuesta JSON
   */
validateEmailToken(token: string): Observable<ValidationResponse> {
    // 3. APUNTAR A LA NUEVA RUTA DE LA API
 return this.http.get<ValidationResponse>(`${environment.apiUrl}/auth/validate?token=${token}`);
}
}

export type { ValidationResponse };