import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Location, isPlatformBrowser } from '@angular/common';
import { AuthService } from '../../services/auth-service/auth-service';
import { themeService } from '../../services/theme-service/theme-service';
import { UtilService } from '../../services/util-service/util-service';

@Component({
  selector: 'app-forgot',
  imports: [FormsModule, CommonModule],
  templateUrl: './forgot.html',
  styleUrls: ['./forgot.css']
})
export class Forgot implements OnInit, OnDestroy {
  email: string = '';
  isLoading: boolean = false;
  emailError: string = '';

  constructor(
    private location: Location,
    private authService: AuthService,
    private themeService: themeService,
    private utilService: UtilService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.initMouseTracking();
    }
  }

  ngOnDestroy() {
    if (isPlatformBrowser(this.platformId)) {
      document.removeEventListener('mousemove', this.handleMouseMove);
    }
  }

  private initMouseTracking() {
    // Optimizar mouse tracking con throttling más agresivo
    let ticking = false;
    let lastUpdate = 0;
    const throttleMs = 16; // ~60fps máximo
    
    const updateMouse = (e: MouseEvent) => {
      const now = Date.now();
      if (!ticking && (now - lastUpdate) > throttleMs) {
        requestAnimationFrame(() => {
          const x = (e.clientX / window.innerWidth) * 100;
          const y = (e.clientY / window.innerHeight) * 100;
          
          document.documentElement.style.setProperty('--mouse-x', `${x}%`);
          document.documentElement.style.setProperty('--mouse-y', `${y}%`);
          
          lastUpdate = now;
          ticking = false;
        });
        ticking = true;
      }
    };

    document.addEventListener('mousemove', updateMouse, { passive: true });
  }

  private handleMouseMove = (e: MouseEvent) => {
    const x = (e.clientX / window.innerWidth) * 100;
    const y = (e.clientY / window.innerHeight) * 100;
    
    document.documentElement.style.setProperty('--mouse-x', `${x}%`);
    document.documentElement.style.setProperty('--mouse-y', `${y}%`);
  }

  goBack(): void {
    this.location.back();
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
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
        this.email = ''; // Limpiar el formulario después del éxito
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

  private censurarCorreo(email: string): string {
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
}
