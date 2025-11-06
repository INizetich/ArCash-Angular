import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators} from '@angular/forms';
import { UtilService } from '../../services/util-service/util-service';
import { RecoveryService } from '../../services/recovery-service/recovery-service';
import { Subscription } from 'rxjs';

import { ThemeToggleComponent } from "../../components/ui/theme-toggle/theme-toggle";
import { strongPasswordValidator, passwordMatchValidator } from '../../components/forms/register-form/register-form';
import { BrandLogoComponent } from "../../components/ui/brand-logo/brand-logo";



@Component({
  selector: 'app-recover-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ThemeToggleComponent, BrandLogoComponent],
  templateUrl: './recover-password.html',
  styleUrls: ['./recover-password.css']
})
export class RecoverPasswordComponent implements OnInit, OnDestroy {
  resetForm!: FormGroup;
  token: string | null = null;
  error: string | null = null;
  isLoading = false;
  isValidatingToken = false;
  showPassword = false;
  showConfirmPassword = false;
  
  private routeSubscription!: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private utilService: UtilService,
    private recoveryService: RecoveryService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.validateToken();
  }

  private validateToken(): void {
    this.isValidatingToken = true;
    
    this.routeSubscription = this.route.queryParams.subscribe(params => {
      this.token = params['token'];
      
      if (!this.token) {
        this.error = 'Token no proporcionado. El enlace puede estar incompleto.';
        this.isValidatingToken = false;
        return;
      }

      this.recoveryService.validateRecoveryToken(this.token).subscribe({
        next: (response) => {
          this.isValidatingToken = false;
          if (!response.valid) {
            // Token inválido, usado o expirado - redirigir a 404
            this.router.navigate(['/404']);
          }
          // Si response.valid es true, el token es válido y se muestra el formulario
        },
        error: (error) => {
          this.isValidatingToken = false;
          console.error('Error validating token:', error);
          // Error del servidor o token inválido - redirigir a 404
          this.router.navigate(['/404']);
        }
      });
    });
  }

  ngOnDestroy(): void {
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
  }

private initializeForm(): void {
    this.resetForm = this.fb.group({
      passwords: this.fb.group({
        
        // --- AQUÍ EL CAMBIO 1 ---
        // Usamos la sintaxis de objeto para añadir updateOn: 'blur'
        password: ['', {
          validators: [Validators.required, strongPasswordValidator],
          
        }],
        
        // --- AQUÍ EL CAMBIO 2 ---
        // Hacemos lo mismo para el segundo control
        confirmPassword: ['', {
          validators: [Validators.required],
         
        }]

      }, { 
        validators: [passwordMatchValidator]
      })
    });
}

  onSubmit(): void {
    if (this.resetForm.invalid || this.isLoading || !this.token) {
      this.resetForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.error = null;

    const password = this.resetForm.get('passwords.password')?.value;
    const confirmPassword = this.resetForm.get('passwords.confirmPassword')?.value;

    this.recoveryService.resetPassword(this.token, password, confirmPassword).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success) {
          this.utilService.showToast('Contraseña restablecida correctamente', 'success');
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 2000);
        } else {
          this.error = response.message || 'Error al restablecer la contraseña';
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error resetting password:', error);
        this.error = error.error?.message || 'Error al restablecer la contraseña. Inténtalo de nuevo.';
      }
    });
  }

  
  canSubmit(): boolean {
    return this.resetForm.valid && !this.isLoading && !!this.token;
  }

  getPasswordErrors(controlName: string): string[] {
    const control = this.resetForm.get(controlName);
    if (!control || !control.errors) return [];

    const errors: string[] = [];
    if (control.hasError('required')) {
      errors.push('La contraseña es obligatoria.');
    }
    if (control.hasError('minLength')) {
      errors.push('La contraseña debe tener al menos 8 caracteres.');
    }
    if (control.hasError('lowercase')) {
      errors.push('Debe contener al menos una letra minúscula.');
    }
    if (control.hasError('uppercase')) {
      errors.push('Debe contener al menos una letra mayúscula.');
    }
    if (control.hasError('number')) {
      errors.push('Debe contener al menos un número.');
    }
    if (control.hasError('specialChar')) {
      errors.push('Debe contener al menos un carácter especial (!@#$%^&*...).');
    }
    return errors;
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  
}
