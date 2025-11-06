import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../enviroments/enviroment'; // <-- IMPORTADO

@Injectable({
  providedIn: 'root'
})
export class RecoveryService {
  
  private baseUrl = environment.apiUrl; // <-- CAMBIADO
  
  constructor(private http: HttpClient) {}

  
  ///METODO GET PARA VALIDAR TOKEN DE RECUPERACIÓN DE CONTRASEÑA
  validateRecoveryToken(token: string): Observable<any> {
    // RUTA ACTUALIZADA
    return this.http.get(`${this.baseUrl}/auth/validate-recovery-token?token=${token}`);
  }

  ///METODO POST PARA RESETEAR CONTRASEÑA CON TOKEN
  resetPassword(token: string, password: string, confirmPassword: string): Observable<any> {
    const params = new URLSearchParams();
    params.append('token', token);
    params.append('password', password);
    params.append('confirmPassword', confirmPassword);
    
    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded'
    };
    
    // RUTA ACTUALIZADA
    return this.http.post(`${this.baseUrl}/auth/reset-password`, params.toString(), {
      headers
    });
  }
}