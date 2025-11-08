import { Component, OnInit, OnDestroy, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth-service/auth-service';
import { ResendService } from '../../../services/resend-service/resend.service';
import { UtilService } from '../../../services/util-service/util-service';



@Component({
  selector: 'app-forgot-password-form',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './forgot-password-form.html',
  styleUrls: ['./forgot-password-form.css']
})
export class ForgotPasswordFormComponent implements OnInit, OnDestroy {
  @Output() emailSent = new EventEmitter<string>();

  email: string = '';
  isLoading: boolean = false;
  emailError: string = '';
  emailSentSuccess: boolean = false;
  showResendSection: boolean = false;
  resendCooldown: number = 0;
  resendTimer: any;
  isResending: boolean = false;

  constructor(
    private authService: AuthService,
    private resendService: ResendService,
    private utilService: UtilService
  ) {}

  ngOnInit() {}

  ngOnDestroy() {
    // Limpiar timer si existe
    if (this.resendTimer) {
      clearInterval(this.resendTimer);
    }
  }

  onSubmit(): void {
    this.emailError = '';
    
    if (!this.email) {
      this.emailError = 'Por favor ingresa tu correo electrónico.';
      this.showToast('Campo requerido: Debes ingresar tu correo electrónico.', 'warning');
      return;
    }

    // Validación básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      this.emailError = 'Por favor ingresa un correo electrónico válido.';
      this.showToast('Formato incorrecto: Revisa que el correo tenga el formato correcto (ejemplo@correo.com).', 'warning');
      return;
    }

    this.isLoading = true;
    
    this.authService.sendRecoverMail(this.email).subscribe({
      next: (response: any) => {
        const censurado = this.censurarCorreo(this.email);
        this.showToast(`Correo enviado exitosamente a ${censurado}. Revisa tu bandeja de entrada.`, 'info');
        this.isLoading = false;
        this.emailSentSuccess = true;
        
        this.emailSent.emit(this.email);
        
        // Mostrar sección de reenvío después de 10 segundos
        setTimeout(() => {
          this.showResendSection = true;
        }, 4000);
      },
      error: (error: any) => {
        console.error('Error en recuperación:', error);
        
        // Diferentes tipos de errores con colores específicos
        if (error.status === 401) {
          this.showToast('Error de autenticación: Problema con el servidor. Intenta nuevamente.', 'warning');
        } else if (error.status === 404) {
          // Usar el mensaje exacto del backend si está disponible
          const mensaje = error.error?.message || 'El correo ingresado no está registrado en el sistema.';
          this.showToast(`${mensaje}`, 'warning');
        } else if (error.status === 429) {
          this.showToast('Demasiados intentos: Espera unos minutos antes de intentar nuevamente.', 'warning');
        } else if (error.status >= 500) {
          this.showToast('Error del servidor: Intenta nuevamente en unos momentos.', 'error');
        } else if (error.status === 0 || !navigator.onLine) {
          this.showToast('Sin conexión: Verifica tu conexión a internet e intenta nuevamente.', 'warning');
        } else {
          this.showToast('Error inesperado: No se pudo procesar la solicitud. Intenta nuevamente.', 'error');
        }
        
        this.isLoading = false;
      }
    });
  }

  censurarCorreo(email: string): string {
    const [usuario, dominio] = email.split('@');
    if (usuario.length <= 2) {
      return usuario[0] + '***@' + dominio;
    }
    const visible = usuario.slice(0, 2);
    return visible + '***@' + dominio;
  }

  private showToast(message: string, type: 'success' | 'error' | 'info' | 'warning'): void {
    this.utilService.showToast(message, type);
  }

  /**
   * Reenvía el correo de recuperación de contraseña
   */
  resendRecoveryEmail(): void {
    if (this.resendCooldown > 0 || this.isResending) {
      return;
    }

    this.isResending = true;
    
    this.resendService.resendPasswordRecovery(this.email).subscribe({
      next: (response) => {
        const censurado = this.censurarCorreo(this.email);
        this.showToast(`Correo reenviado exitosamente a ${censurado}.`, 'success');
        this.isResending = false;
        this.startResendCooldown();
      },
      error: (error) => {
        console.error('Error al reenviar:', error);
        
        if (error.status === 429) {
          this.showToast('Demasiados intentos: Espera un momento antes de solicitar otro reenvío.', 'warning');
        } else if (error.status === 404) {
          this.showToast('El correo no está registrado en el sistema.', 'warning');
        } else {
          this.showToast('Error al reenviar: Intenta nuevamente en unos momentos.', 'error');
        }
        
        this.isResending = false;
      }
    });
  }

  /**
   * Inicia el cooldown para evitar spam de reenvíos
   */
  private startResendCooldown(): void {
    this.resendCooldown = 60; // 60 segundos
    
    this.resendTimer = setInterval(() => {
      this.resendCooldown--;
      
      if (this.resendCooldown <= 0) {
        clearInterval(this.resendTimer);
        this.resendTimer = null;
      }
    }, 1000);
  }

  /**
   * Resetea el formulario para enviar a otro email
   */
  sendToAnotherEmail(): void {
    this.email = '';
    this.emailSentSuccess = false;
    this.showResendSection = false;
    this.resendCooldown = 0;
    
    if (this.resendTimer) {
      clearInterval(this.resendTimer);
      this.resendTimer = null;
    }
  }
}
