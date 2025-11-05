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
import { UtilService } from '../../services/util-service/util-service';
import { RecoveryService } from '../../services/recovery-service/recovery-service';
import { Subscription } from 'rxjs';

// --- VALIDADORES PERSONALIZADOS ---
export function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;
  return password === confirmPassword ? null : { passwordMismatch: true };
}

export function strongPasswordValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  
  if (!value) {
    return null;
  }

  const errors: ValidationErrors = {};

  if (value.length < 8) {
    errors['minLength'] = true;
  }

  if (!/[a-z]/.test(value)) {
    errors['lowercase'] = true;
  }

  if (!/[A-Z]/.test(value)) {
    errors['uppercase'] = true;
  }

  if (!/[0-9]/.test(value)) {
    errors['number'] = true;
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
    errors['specialChar'] = true;
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

@Component({
  selector: 'app-recover-password',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule
  ],
  templateUrl: './recover-password.html',
  styleUrls: ['./recover-password.css']
})
export class RecoverPasswordComponent implements OnInit, OnDestroy {
  resetForm!: FormGroup;
  token: string | null = null;
  error: string | null = null;
  isLoading = false;
  isValidatingToken = false;
  
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

  ngOnDestroy(): void {
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
  }

  private initializeForm(): void {
    this.resetForm = this.fb.group({
      passwords: this.fb.group({
        password: ['', [Validators.required, strongPasswordValidator]],
        confirmPassword: ['', [Validators.required]]
      }, { validators: [passwordMatchValidator] })
    });
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
          if (!response.success) {
            this.error = response.message || 'Token inválido o expirado.';
            this.token = null;
          }
        },
        error: (error) => {
          this.isValidatingToken = false;
          console.error('Error validating token:', error);
          this.error = error.error?.message || 'Error al validar el enlace. Puede estar expirado.';
          this.token = null;
        }
      });
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

  toggleTheme(): void {
    document.documentElement.classList.toggle('dark-theme');
  }

  goBack(): void {
    this.router.navigate(['/forgot']);
  }

  canSubmit(): boolean {
    return this.resetForm.valid && !this.isLoading && !!this.token;
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  requestNewLink(): void {
    this.router.navigate(['/forgot']);
  }
}
