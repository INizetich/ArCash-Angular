import { Injectable } from '@angular/core';
import User from '../../models/users';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs'; // <-- Agrega throwError
import { catchError } from 'rxjs/operators'; // <-- Agrega catchError
import { environment } from '../../../enviroments/enviroment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  
  private baseUrl = environment.apiUrl;
  
  constructor(private http: HttpClient){}

  ///METODO POST PARA CREAR EL USUARIO
  registerUser(user: User){
    return this.http.post<any>(`${this.baseUrl}/user/create`, user)
  }

  ///METODO POST PARA LOGIN DEL USUARIO
  loginUser(credentials: {username: string, password: string}) {
    return this.http.post<any>(`${this.baseUrl}/auth/login`, credentials, {
      withCredentials: true
    })
  }

  isLoggedIn(): boolean{
    return !!localStorage.getItem("JWT")
  }

  ///METODO POST PARA ENVIAR EMAIL DE RECUPERACION
  sendRecoverMail(email: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/auth/send-recover-mail`, { email })
  }

  ///METODO POST PARA REFRESH TOKEN
  refreshToken(): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/auth/refresh`, {}, {
      withCredentials: true
    }).pipe(
      catchError((error: any) => { // <-- Especifica el tipo 'any'
        // Si el refresh token también expiró, limpiar sesión
        if (error.status === 401 || error.status === 498) {
          this.clearLocalSession();
        }
        return throwError(() => error);
      })
    );
  }

  ///METODO POST PARA LOGOUT
  logoutUser(): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/auth/logout`, {}, {
      withCredentials: true
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
    // Limpiar datos de autenticación
    localStorage.removeItem('JWT');
    localStorage.removeItem('accountId');
    localStorage.removeItem('role');
    localStorage.removeItem('userData');
    localStorage.removeItem('usuariosAdmin')
    
    // Limpiar también todos los cachés de ArCash
    const keys = Object.keys(localStorage);
    const arcashKeys = keys.filter(key => key.startsWith('arcash_'));
    arcashKeys.forEach(key => localStorage.removeItem(key));
  }
}