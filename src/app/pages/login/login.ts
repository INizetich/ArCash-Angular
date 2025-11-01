import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { themeService } from '../../services/theme-service/theme-service';
import { AuthService } from '../../services/auth-service/auth-service';
import { UtilService } from '../../services/util-service/util-service';
import { CacheService } from '../../services/cache-service/cache.service';
import { DataService } from '../../services/data-service/data-service';

@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login implements OnInit {
  loginForm: FormGroup;
  isLoading = false;
  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private themeService: themeService,
    private authService: AuthService,
    private utilService: UtilService,
    private cacheService: CacheService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required]]
    });
  }

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      // Limpiar cualquier caché residual de sesiones anteriores
      this.clearAllCaches();
      
      // Verificar si hay una sesión activa
      const token = localStorage.getItem('JWT');
      if (token) {
        this.router.navigate(['/dashboard'], { replaceUrl: true });
        return;
      }
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

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  goBack() {
    if (isPlatformBrowser(this.platformId)) {
      this.router.navigate([''])
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
      // Ya no necesita ser 'async'
      next: (response) => { 
        this.isLoading = false;
        this.utilService.showToast("Inicio de sesión exitoso.", "success");
        this.loginForm.reset();

        if (isPlatformBrowser(this.platformId)) {
          // Guardar información de sesión en localStorage
          localStorage.setItem('JWT', response.accessToken);
          localStorage.setItem('accountId', response.accountId);
          localStorage.setItem('role', response.role);
        }

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

  goTo(path: string){
    this.router.navigate([`/${path}`]);
  }
}
