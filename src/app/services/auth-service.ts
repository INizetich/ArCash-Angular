import { Injectable } from '@angular/core';
import User from '../models/users';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  
  constructor(private http : HttpClient){}

  ///METODO POST PARA CREAR EL USUARIO
  registerUser(user : User){
    return this.http.post<User>("https://localhost:8080/api/user/create", user)
  }

  ///METODO POST PARA LOGIN DEL USUARIO
  loginUser(credentials: {username: string, password: string}) {
    return this.http.post<any>("http://localhost:8080/api/auth/login", credentials)
  }

}
