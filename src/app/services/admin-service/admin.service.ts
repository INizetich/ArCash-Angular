import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserResponse, AdminRequest, AdminResponse } from '../../models/admin.interface';
import { environment } from '../../../enviroments/enviroment';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = environment.apiUrl + '/admin'; // <-- CAMBIADO

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('JWT');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // Verificar acceso de admin
  checkAccess(): Observable<any> {
    return this.http.get(`${this.apiUrl}/check-access`, {
      headers: this.getHeaders()
    });
  }

  // Obtener todos los usuarios autenticados
  getAuthenticatedUsers(): Observable<UserResponse[]> {
    return this.http.get<UserResponse[]>(`${this.apiUrl}/users`, {
      headers: this.getHeaders()
    });
  }

  // Inhabilitar usuario
  disableUser(userId: number): Observable<string> {
    return this.http.put(`${this.apiUrl}/users/${userId}/disable`, {}, {
      headers: this.getHeaders(),
      responseType: 'text'
    });
  }

  // Habilitar usuario
  enableUser(userId: number): Observable<string> {
    return this.http.put(`${this.apiUrl}/users/${userId}/enable`, {}, {
      headers: this.getHeaders(),
      responseType: 'text'
    });
  }

  // Crear nuevo administrador
  createAdmin(adminData: AdminRequest): Observable<string> {
    return this.http.post(`${this.apiUrl}/users/create-admin`, adminData, {
      headers: this.getHeaders(),
      responseType: 'text'
    });
  }

  // Verificar si el usuario actual es admin
  isAdmin(): boolean {
    const role = localStorage.getItem('role');
    return role === 'ADMIN';
  }

  // Obtener usuarios desde localStorage
  getCachedUsers(): UserResponse[] | null {
    const users = localStorage.getItem('usuariosAdmin');
    return users ? JSON.parse(users) : null;
  }

  // Guardar usuarios en localStorage
  cacheUsers(users: UserResponse[]): void {
    localStorage.setItem('usuariosAdmin', JSON.stringify(users));
  }

  // Actualizar estado de usuario en cache
  updateUserInCache(userId: number, active: boolean): void {
    const users = this.getCachedUsers();
    if (users) {
      const userIndex = users.findIndex(user => user.id === userId);
      if (userIndex !== -1) {
        users[userIndex].active = active;
        this.cacheUsers(users);
      }
    }
  }
}