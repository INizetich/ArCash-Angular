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
    private dataService: DataService,
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
        // Si hay un token, redirigir al dashboard
        this.router.navigate(['/dashboard']);
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
        next: async (response) => {
          this.isLoading = false;
          this.utilService.showToast("Inicio de sesión exitoso!", "success");
          this.loginForm.reset();
          
          if (isPlatformBrowser(this.platformId)) {
            // Guardar información de sesión en localStorage
            localStorage.setItem('JWT', response.accessToken);
            localStorage.setItem('accountId', response.accountId);
            localStorage.setItem('role', response.role);
            
            try {
              // Cargar los datos del usuario desde el backend
              await this.dataService.loadUserData();

            } catch (error) {
              console.error('❌ Login: Error cargando datos del usuario:', error);
              // Aún así redirigir al dashboard, se intentará cargar ahí
            }
          }
          
          setTimeout(() => {
            this.router.navigate(['/dashboard']);
          }, 2000);
        },
        error: (error) => {
          this.isLoading = false;
          
          let errorMessage = "Error al iniciar sesión";
          if (error.error?.message) {
            if (error.error.message === "Usuario no encontrado") {
              errorMessage = "Usuario no encontrado, por favor verifique la información.";
            } else if (error.error.message === "Credenciales incorrectas") {
              errorMessage = "Credenciales incorrectas, por favor verifique sus credenciales.";
            } else {
              errorMessage = error.error.message;
            }
          }
          
          this.utilService.showToast(errorMessage, "error");
        }
      });
    } else {
      // Marcar todos los campos como touched para mostrar errores
      Object.keys(this.loginForm.controls).forEach(key => {
        this.loginForm.get(key)?.markAsTouched();
      });
    }
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  goTo(path: string){
  this.router.navigate([`/${path}`])
}
}
