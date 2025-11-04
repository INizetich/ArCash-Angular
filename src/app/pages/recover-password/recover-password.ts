import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { 
  ReactiveFormsModule, 
  FormBuilder, 
  FormGroup, 
  Validators,
  AbstractControl,
  ValidationErrors 
} from '@angular/forms';
import { themeService } from '../../services/theme-service/theme-service';
import { UtilService } from '../../services/util-service/util-service';
import { RecoveryService } from '../../services/recovery-service/recovery-service';
import { Subscription } from 'rxjs';

// --- VALIDADORES PERSONALIZADOS ---
export function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;

  // Si las contraseñas no coinciden, retornamos un objeto de error. Si coinciden, retornamos null.
  return password === confirmPassword ? null : { passwordMismatch: true };
}

// Validador personalizado para contraseña segura
export function strongPasswordValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  
  if (!value) {
    return null; // Si está vacío, el required se encarga
  }

  const errors: ValidationErrors = {};

  // Verificar longitud mínima
  if (value.length < 8) {
    errors['minLength'] = true;
  }

  // Verificar al menos una minúscula
  if (!/[a-z]/.test(value)) {
    errors['lowercase'] = true;
  }

  // Verificar al menos una mayúscula
  if (!/[A-Z]/.test(value)) {
    errors['uppercase'] = true;
  }

  // Verificar al menos un número
  if (!/\d/.test(value)) {
    errors['number'] = true;
  }

  // Verificar al menos un carácter especial
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?]/.test(value)) {
    errors['specialChar'] = true;
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

@Component({
  selector: 'app-recover-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './recover-password.html',
  styleUrls: ['./recover-password.css']
})
export class RecoverPasswordComponent implements OnInit, OnDestroy {
  resetForm: FormGroup;
  token: string = '';
  isLoading = false;
  isValidatingToken = true; // Nueva variable para controlar la validación inicial
  error: string = '';
  currentTheme: string = 'light';
  private themeSubscription: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private themeService: themeService,
    private utilService: UtilService,
    private recoveryService: RecoveryService
  ) {
    // Crear formulario con grupo de contraseñas igual que register
    this.resetForm = this.fb.group({
      passwords: this.fb.group({
        password: ['', [
          Validators.required, 
          strongPasswordValidator
        ]],
        confirmPassword: ['', [Validators.required]]
      }, { 
        validators: passwordMatchValidator // Aplicamos nuestro validador personalizado a este grupo.
      })
    });

    // Suscribirse a los cambios de tema
    this.themeSubscription = this.themeService.theme$.subscribe(theme => {
      this.currentTheme = theme;
    });
  }

  ngOnInit() {
    // Obtener el token desde la URL
    this.route.queryParams.subscribe(params => {
      this.token = params['token'] || '';
      
      // Validar si el token está vacío, es "error" o no es válido
      if (!this.token || this.token.trim() === '' || this.token === 'error') {
        // Navegar inmediatamente sin mostrar nada
        this.router.navigate(['/404']);
        return;
      }
      
      // Mantener isValidatingToken = true hasta que se complete la validación
      // Validar token con el backend al cargar la página
      this.recoveryService.validateRecoveryToken(this.token).subscribe({
        next: (response) => {
          // Token válido, mostrar el formulario
          console.log('Recovery token validation successful:', response);
          this.isValidatingToken = false; // Solo aquí permitir mostrar el formulario
        },
        error: (error) => {
          // Token inválido, usado, o expirado - redirigir a 404 inmediatamente
          console.log('Recovery token validation failed:', error);
          this.router.navigate(['/404']);
        }
      });
    });
  }

  get password() {
    return this.resetForm.get('passwords.password');
  }

  get confirmPassword() {
    return this.resetForm.get('passwords.confirmPassword');
  }

  get passwordsGroup() {
    return this.resetForm.get('passwords');
  }

  get canSubmit(): boolean {
    return this.resetForm.valid && !this.isLoading && !!this.token;
  }

  async onSubmit() {
    if (!this.canSubmit) {
      this.resetForm.markAllAsTouched();
      this.utilService.showToast("Formulario incompleto: Revisa y completa todos los campos.", "warning");
      return;
    }

    this.isLoading = true;
    this.error = '';

    try {
      const passwordValue = this.password?.value;
      const confirmPasswordValue = this.confirmPassword?.value;

      console.log('Attempting password reset with token:', this.token);

      // Ir directamente al reset-password
      this.recoveryService.resetPassword(
        this.token,
        passwordValue,
        confirmPasswordValue
      ).subscribe({
        next: (response: any) => {
          console.log('Reset password response:', response);
          
          // Ahora el backend devuelve JSON con {success: boolean, message: string}
          if (response.success) {
            this.utilService.showToast('Contraseña modificada exitosamente', 'success');
            setTimeout(() => {
              this.router.navigate(['/login']);
            }, 2000);
          } else {
            this.error = response.message || 'Error al modificar la contraseña';
            this.utilService.showToast(response.message || 'Error al modificar la contraseña', 'error');
          }
          this.isLoading = false;
        },
        error: (error: any) => {
          console.error('Error resetting password:', error);
          
          // Manejar errores específicos
          if (error.status === 401) {
            this.error = error.error?.message || 'Token inválido o expirado. Por favor, solicita un nuevo enlace de recuperación.';
            this.utilService.showToast('Token inválido o expirado', 'error');
          } else if (error.status === 400) {
            this.error = error.error?.message || 'Las contraseñas no cumplen los requisitos o no coinciden.';
            this.utilService.showToast('Error en los datos proporcionados', 'warning');
          } else if (error.status === 500) {
            this.error = 'Error interno del servidor. Por favor, inténtalo más tarde.';
            this.utilService.showToast('Error del servidor', 'error');
          } else {
            this.error = 'Error al modificar la contraseña. Por favor, inténtalo de nuevo.';
            this.utilService.showToast('Error al modificar la contraseña', 'error');
          }
          this.isLoading = false;
        }
      });
    } catch (error) {
      console.error('Error resetting password:', error);
      this.error = 'Error de conexión. Por favor, inténtalo de nuevo.';
      this.utilService.showToast('Error de conexión', 'error');
      this.isLoading = false;
    }
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  goToHome() {
    this.router.navigate(['/']);
  }

  goBack() {
    this.router.navigate(['/login']);
  }

  ngOnDestroy() {
    if (this.themeSubscription) {
      this.themeSubscription.unsubscribe();
    }
  }
}
