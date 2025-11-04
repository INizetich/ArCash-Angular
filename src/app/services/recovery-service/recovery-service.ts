import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RecoveryService {
  
  private baseUrl = 'http://localhost:8080';
  
  constructor(private http: HttpClient) {}

  
  ///METODO GET PARA VALIDAR TOKEN DE RECUPERACIÓN DE CONTRASEÑA
  validateRecoveryToken(token: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/validate-recovery-token?token=${token}`);
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
    
    return this.http.post(`${this.baseUrl}/reset-password`, params.toString(), {
      headers
    });
  }
}
