import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

/**
 * Servicio para manejar la navegación segura hacia la página de reenvío.
 * Proporciona métodos para navegar a /resend desde contextos válidos.
 */
@Injectable({
  providedIn: 'root'
})
export class ResendNavigationService {

  constructor(private router: Router) { }

  /**
   * Navega a la página de reenvío desde el contexto de validación
   * (cuando un token ha expirado o es inválido)
   */
  navigateFromValidation(): void {
    this.setResendAccess();
    this.router.navigate(['/resend'], { 
      state: { 
        allowResendAccess: true,
        from: 'validation' 
      }
    });
  }

  /**
   * Navega a la página de reenvío desde el contexto de login
   * (cuando el usuario necesita reenviar su email de validación)
   */
  navigateFromLogin(): void {
    this.setResendAccess();
    this.router.navigate(['/resend'], { 
      state: { 
        allowResendAccess: true,
        from: 'login' 
      }
    });
  }

  /**
   * Navega a la página de reenvío desde el contexto de registro
   * (cuando el usuario no recibió el email de validación)
   */
  navigateFromRegister(): void {
    this.setResendAccess();
    this.router.navigate(['/resend'], { 
      state: { 
        allowResendAccess: true,
        from: 'register' 
      }
    });
  }

  /**
   * Navega a la página de reenvío desde el contexto de recuperación de contraseña
   * (cuando el usuario no recibió el email de recuperación)
   */
  navigateFromForgotPassword(): void {
    this.setResendAccess();
    this.router.navigate(['/resend'], { 
      state: { 
        allowResendAccess: true,
        from: 'forgot-password' 
      }
    });
  }

  /**
   * Establece el flag de acceso en sessionStorage para permitir 
   * el acceso a la página de reenvío
   */
  private setResendAccess(): void {
    sessionStorage.setItem('resendAccess', 'true');
  }

  /**
   * Verifica si el acceso a resend está permitido actualmente
   */
  isResendAccessAllowed(): boolean {
    return sessionStorage.getItem('resendAccess') === 'true';
  }

  /**
   * Limpia el acceso a resend (usado por el guard después de permitir acceso)
   */
  clearResendAccess(): void {
    sessionStorage.removeItem('resendAccess');
  }
}
