import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class themeService {

  // Usamos Observer para que los componentes se puedan suscribir al cambio de tema
  private themeSubject = new BehaviorSubject<string>('light')
  theme$ = this.themeSubject.asObservable()

  constructor(){
    this.loadInitialTheme()
  }

  /// leer tema guardado o de preferencia
  private loadInitialTheme(){
    const savedTheme = localStorage.getItem('nv-theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    const initialTheme = savedTheme ? savedTheme : (systemPrefersDark ? 'dark' : 'light')

    // Aplicar el tema inicial sin emitir cambios, solo establecer el DOM y el BehaviorSubject
    document.documentElement.setAttribute('data-theme', initialTheme);
    this.themeSubject.next(initialTheme);
    console.log('Theme service: Initial theme loaded:', initialTheme);
  }

  /// cambiar el tema
  toggleTheme(){
    const newTheme = this.themeSubject.value === 'dark' ? 'light' : 'dark'
    console.log('Theme service: Toggling theme from', this.themeSubject.value, 'to', newTheme);
    this.setTheme(newTheme);
  }

  /// aplica el tema y guarda en localStorage
  private setTheme(theme : string){
    console.log('Theme service: Setting theme to:', theme);
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('nv-theme', theme)
    this.themeSubject.next(theme)
  }

  ///obtiene el tema actual
  getTheme(): string{
    return this.themeSubject.value;
  }
  
}
