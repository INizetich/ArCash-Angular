import { Component, OnInit, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth-service/auth-service';
import { UtilService } from '../../../services/util-service/util-service';
import { CacheService } from '../../../services/cache-service/cache.service';
import { ResendNavigationService } from '../../../services/resend-navigation/resend-navigation.service';

@Component({
  selector: 'app-login-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login-form.html',
  styleUrls: ['./login-form.css']
})
export class LoginFormComponent implements OnInit {
  @Output() loginSuccess = new EventEmitter<any>();

  loginForm: FormGroup;
  isLoading = false;
  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private utilService: UtilService,
    private cacheService: CacheService,
    private resendNavigationService: ResendNavigationService
  ) {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required]]
    });
  }

  ngOnInit() {
    // Limpiar cualquier caché residual de sesiones anteriores
    this.clearAllCaches();
    
    // Verificar si hay una sesión activa
    const token = localStorage.getItem('JWT');
    if (token) {
      this.router.navigate(['/dashboard'], { replaceUrl: true });
      return;
    }
  }

  private clearAllCaches(): void {
    try {
      // Limpiar todos los cachés de ArCash usando el CacheService centralizado
      this.cacheService.clearCachesByPrefix('arcash_');
    } catch (error) {
      console.error('Error limpiando cachés residuales:', error);
    }
  }

  onSubmit() {
    if (this.loginForm.valid && !this.isLoading) {
      this.isLoading = true;

      const loginData = {
        username: this.loginForm.get('username')?.value.trim(),
        password: this.loginForm.get('password')?.value.trim()
      };

      this.authService.loginUser(loginData).subscribe({
        next: (response) => { 
          this.isLoading = false;
          this.utilService.showToast("Inicio de sesión exitoso.", "success");
          this.loginForm.reset();

          // Guardar información de sesión en localStorage
          localStorage.setItem('JWT', response.accessToken);
          localStorage.setItem('accountId', response.accountId);
          localStorage.setItem('role', response.role);

          this.loginSuccess.emit(response);

          // Redirige al dashboard después del delay
          setTimeout(() => {
            this.router.navigate(['/dashboard'], { replaceUrl: true });
          }, 2500);
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Error en login:', error);
          
          // Manejo inteligente de errores con colores apropiados
          if (error.status === 401) {
            this.utilService.showToast("Nombre de usuario y/o contraseña incorrecta", "error");
          } else if (error.status === 403) {
            this.utilService.showToast("Cuenta inhabilitada, por favor confirma su cuenta", "error");
          } else if (error.status >= 500) {
            this.utilService.showToast("Error del servidor: Intenta nuevamente en unos momentos.", "error");
          } else if (error.status === 0 || !navigator.onLine) {
            this.utilService.showToast("Sin conexión: Verifica tu conexión a internet.", "warning");
          } else {
            this.utilService.showToast("Error inesperado: No se pudo iniciar sesión. Intenta nuevamente.", "error");
          }
        }
      });
    } else {
      // Marcar campos como touched y mostrar mensaje de validación
      Object.keys(this.loginForm.controls).forEach(key => {
        this.loginForm.get(key)?.markAsTouched();
      });
      
      this.utilService.showToast("Campos incompletos: Completa todos los campos requeridos.", "warning");
    }
  }

  

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  goTo(path: string) {
    this.router.navigate([`/${path}`]);
  }

  /**
   * Navega al componente de reenvío desde el contexto de login
   * para permitir reenvío de emails de validación
   */
  goToResend() {
    this.resendNavigationService.navigateFromLogin();
  }
}
