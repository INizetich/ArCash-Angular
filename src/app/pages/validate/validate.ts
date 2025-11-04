import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { themeService } from '../../services/theme-service/theme-service';
import { UtilService } from '../../services/util-service/util-service';
import { ValidationService, type ValidationResponse } from '../../services/validation-service/validation-service';
import { ResendNavigationService } from '../../services/resend-navigation/resend-navigation.service';
import { ResendService } from '../../services/resend-service/resend.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-validate',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './validate.html',
  styleUrls: ['./validate.css']
})
export class ValidateComponent implements OnInit, OnDestroy {
  validationResult: ValidationResponse | null = null;
  isLoading = true;
  currentTheme: string = 'light';
  isResending = false;
  private themeSubscription: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private themeService: themeService,
    private utilService: UtilService,
    private validationService: ValidationService,
    private resendNavigationService: ResendNavigationService,
    private resendService: ResendService
  ) {
    // Suscribirse a los cambios de tema
    this.themeSubscription = this.themeService.theme$.subscribe(theme => {
      this.currentTheme = theme;
    });
  }

  ngOnInit() {
    // Obtener el token desde la URL
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      
      // Validar si el token está vacío, es "error" o no es válido
      if (!token || token.trim() === '' || token === 'error') {
        // Navegar inmediatamente a 404 sin mostrar nada
        this.router.navigate(['/404']);
        return;
      }
      
      this.validateToken(token);
    });
  }

  private validateToken(token: string) {
    // Usar el ValidationService para la validación
    this.validationService.validateEmailToken(token).subscribe({
      next: (response: ValidationResponse) => {
        this.validationResult = response;
        this.isLoading = false;
        
        // Mostrar mensaje de toast apropiado
        if (response.success) {
          this.utilService.showToast('¡Cuenta verificada exitosamente! Ya puedes iniciar sesión.', 'success');
        } else {
          // Determinar el tipo de toast según el mensaje
          if (response.message.includes('ya fue utilizado')) {
            this.utilService.showToast('Esta cuenta ya está activada.', 'info');
          } else if (response.message.includes('expirado')) {
            this.utilService.showToast('El enlace ha expirado. Solicita un nuevo enlace de activación.', 'warning');
          } else {
            this.utilService.showToast(response.message, 'error');
          }
        }
      },
      error: (error: any) => {
        console.error('Error validating token:', error);
        
        // Si es un error 404 o de token inválido, redirigir a 404
        if (error.status === 404 || error.status === 400) {
          this.router.navigate(['/404']);
          return;
        }
        
        // Para otros errores (conexión, etc.), mostrar mensaje de error
        this.validationResult = {
          success: false,
          message: 'Error al validar el token. Por favor, inténtalo de nuevo.'
        };
        this.utilService.showToast('Error de conexión', 'error');
        this.isLoading = false;
      }
    });
  }

  getMessage(): string {
    if (this.isLoading) {
      return 'Validando tu cuenta...';
    }
    return this.validationResult?.message || 'Token no proporcionado en la URL.';
  }

  getBtnClass(): string {
    if (!this.validationResult) {
      return 'btn-error';
    }
    return this.validationResult.success ? 'btn-success' : 'btn-error';
  }

  goToHome() {
    this.router.navigate(['/']);
  }

  goToResend() {
    this.resendNavigationService.navigateFromValidation();
  }

  showResendOption(): boolean {
    return this.validationResult?.success === false && !this.isLoading;
  }

  /**
   * Reenvía el correo de validación directamente desde esta página
   */
  resendValidationEmail(): void {
    if (this.isResending) return;

    // Solicitar al usuario su email a través de un prompt simple
    const email = prompt('Ingresa tu correo electrónico para reenviar el enlace de validación:');
    
    if (!email || email.trim() === '') {
      this.utilService.showToast('Operación cancelada.', 'info');
      return;
    }

    // Validación básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      this.utilService.showToast('Por favor ingresa un correo electrónico válido.', 'warning');
      return;
    }

    this.isResending = true;

    this.resendService.resendValidationEmail(email).subscribe({
      next: (response) => {
        const censurado = this.censurarCorreo(email);
        this.utilService.showToast(`Correo reenviado exitosamente a ${censurado}.`, 'success');
        this.isResending = false;
      },
      error: (error) => {
        console.error('Error al reenviar:', error);
        
        if (error.status === 404) {
          this.utilService.showToast('El correo no está registrado en el sistema.', 'warning');
        } else if (error.status === 400) {
          this.utilService.showToast('La cuenta ya está validada.', 'info');
        } else if (error.status === 429) {
          this.utilService.showToast('Demasiados intentos: Espera un momento antes de solicitar otro reenvío.', 'warning');
        } else {
          this.utilService.showToast('Error al reenviar: Intenta nuevamente en unos momentos.', 'error');
        }
        
        this.isResending = false;
      }
    });
  }

  /**
   * Censura un email mostrando solo los primeros caracteres
   */
  private censurarCorreo(email: string): string {
    const [usuario, dominio] = email.split('@');
    if (usuario.length <= 2) {
      return usuario[0] + '***@' + dominio;
    }
    const visible = usuario.slice(0, 2);
    return visible + '***@' + dominio;
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  ngOnDestroy() {
    if (this.themeSubscription) {
      this.themeSubscription.unsubscribe();
    }
  }
}
