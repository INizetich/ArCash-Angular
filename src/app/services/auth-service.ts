import { Injectable } from '@angular/core';
import User from '../models/users';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  
  private baseUrl = 'http://localhost:8080/api';
  
  constructor(private http : HttpClient){}

  ///METODO POST PARA CREAR EL USUARIO
  registerUser(user : User){
    return this.http.post<User>(`${this.baseUrl}/user/create`, user)
  }

  ///METODO POST PARA LOGIN DEL USUARIO
  loginUser(credentials: {username: string, password: string}) {
    // ✅ Agregamos withCredentials para aceptar cookies
    return this.http.post<any>(`${this.baseUrl}/auth/login`, credentials, {
      withCredentials: true // Esto permite recibir y enviar cookies
    })
  }

  ///METODO POST PARA ENVIAR EMAIL DE RECUPERACION
  sendRecoverMail(email: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/auth/send-recover-mail`, { email })
  }

  ///METODO POST PARA REFRESH TOKEN
  refreshToken(): Observable<any> {
    // ✅ Endpoint para refrescar el token usando la cookie httpOnly
    return this.http.post<any>(`${this.baseUrl}/auth/refresh`, {}, {
      withCredentials: true // Incluye la cookie refreshToken automáticamente
    })
  }

  ///METODO POST PARA LOGOUT
  logoutUser(accessToken: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/auth/logout`, {}, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      withCredentials: true // Para limpiar la cookie refreshToken
    })
  }

  ///METODO PARA VERIFICAR SI HAY TOKEN VÁLIDO
  hasValidSession(): boolean {
    const jwt = localStorage.getItem('JWT');
    const accountId = localStorage.getItem('accountId');
    return !!(jwt && accountId);
  }

  ///METODO PARA LIMPIAR SESIÓN LOCAL
  clearLocalSession(): void {
    localStorage.removeItem('JWT');
    localStorage.removeItem('accountId');
    localStorage.removeItem('role');
    localStorage.removeItem('userData');
  }

  

}
