import { Component, OnInit, OnDestroy, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  ReactiveFormsModule, 
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors 
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth-service/auth-service';
import { ResendService } from '../../../services/resend-service/resend.service';
import { UtilService } from '../../../services/util-service/util-service';

// Validadores personalizados
export function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;
  return password === confirmPassword ? null : { passwordMismatch: true };
}

export function emailMatchValidator(control: AbstractControl): ValidationErrors | null {
  const email = control.get('email')?.value;
  const confirmEmail = control.get('confirmEmail')?.value;
  return email === confirmEmail ? null : { emailMismatch: true };
}

export function strongPasswordValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (!value) return null;

  const errors: ValidationErrors = {};

  if (value.length < 8) errors['minLength'] = true;
  if (!/[a-z]/.test(value)) errors['lowercase'] = true;
  if (!/[A-Z]/.test(value)) errors['uppercase'] = true;
  if (!/\d/.test(value)) errors['number'] = true;
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?]/.test(value)) errors['specialChar'] = true;

  return Object.keys(errors).length > 0 ? errors : null;
}

@Component({
  selector: 'app-register-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register-form.html',
  styleUrls: ['./register-form.css']
})
export class RegisterFormComponent implements OnInit, OnDestroy {
  @Output() registerSuccess = new EventEmitter<string>();

  registerForm!: FormGroup;
  showPassword = false;
  showConfirmPassword = false;
  loading = false;
  registrationSuccessful = false;
  registeredEmail = '';
  showResendSection = false;
  isResending = false;
  resendCooldown = 0;
  resendTimer: any;

  constructor(
    private fb: FormBuilder,
    private utilService: UtilService, 
    private authService: AuthService, 
    private resendService: ResendService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.registerForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.pattern('[A-Za-zÁÉÍÓÚáéíóúÑñ\\s]{2,50}'), Validators.minLength(2), Validators.maxLength(50)]],
      apellido: ['', [Validators.required, Validators.pattern('[A-Za-zÁÉÍÓÚáéíóúÑñ\\s]{2,50}'), Validators.minLength(2), Validators.maxLength(50)]],
      dni: ['', [Validators.required, Validators.pattern('^\\d{8}$'), Validators.minLength(8), Validators.maxLength(8)]],
      alias: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(10), Validators.pattern('^[a-zA-Z0-9_-]+$')]],
      
      emails: this.fb.group({
        email: ['', [Validators.required, Validators.email, Validators.pattern('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$')]],
        confirmEmail: ['', [Validators.required, Validators.email]]
      }, { 
        validators: emailMatchValidator
      }),
      
      passwords: this.fb.group({
        password: ['', [Validators.required, strongPasswordValidator]],
        confirmPassword: ['', [Validators.required]]
      }, { 
        validators: passwordMatchValidator
      })
    });
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      this.utilService.showToast("Formulario incompleto: Revisa y completa todos los campos marcados en rojo.", "warning");
      return;
    }

    if (this.loading) return;

    this.loading = true;

    const formData = this.registerForm.value;
    const userData = {
      name: formData.nombre,
      lastName: formData.apellido,
      dni: formData.dni,
      email: formData.emails.email,
      password: formData.passwords.password,
      alias: formData.alias
    };

    this.authService.registerUser(userData).subscribe({
      next: (response) => {
        this.loading = false;
        this.registrationSuccessful = true;
        this.registeredEmail = userData.email;
        
        const emailCensurado = this.censurarCorreo(userData.email);
        this.utilService.showToast(`¡Registro exitoso! Se envió un correo de validación a ${emailCensurado}. Revisa tu bandeja de entrada para activar tu cuenta.`, "success");
        
        this.registerSuccess.emit(userData.email);
        
        setTimeout(() => {
          this.showResendSection = true;
        }, 15000);
      },
      error: (error) => {
        this.loading = false;
        console.error('Error en registro:', error);
        
        const backendMessage = error.error?.message || error.error?.mensaje;
        
        if (backendMessage) {
          if (backendMessage.includes("email ya se encuentra en uso") ||
              backendMessage.includes("nombre de usuario no está disponible") ||
              backendMessage.includes("DNI ya está registrado")) {
            this.utilService.showToast(backendMessage, "warning");
          } else if (backendMessage.includes("campos son obligatorios")) {
            this.utilService.showToast("Todos los campos son obligatorios.", "warning");
          } else {
            this.utilService.showToast(backendMessage, "error");
          }
        } else {
          if (error.status === 400) {
            this.utilService.showToast("Datos inválidos. Revisa que todos los campos tengan el formato correcto.", "warning");
          } else if (error.status >= 500) {
            this.utilService.showToast("Error del servidor. Intenta registrarte nuevamente en unos momentos.", "error");
          } else if (error.status === 0 || !navigator.onLine) {
            this.utilService.showToast("Sin conexión. Verifica tu conexión a internet e intenta nuevamente.", "warning");
          } else {
            this.utilService.showToast("Error inesperado. No se pudo completar el registro. Intenta nuevamente.", "error");
          }
        }
      }
    });
  }

  onDniInput(event: any): void {
    const input = event.target;
    let value = input.value;
    
    value = value.replace(/\D/g, '');
    
    if (value.length > 8) {
      value = value.substring(0, 8);
    }
    
    input.value = value;
    this.registerForm.get('dni')?.setValue(value);
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  censurarCorreo(email: string): string {
    const [usuario, dominio] = email.split('@');
    if (usuario.length <= 2) {
      return usuario[0] + '***@' + dominio;
    }
    const visible = usuario.slice(0, 2);
    return visible + '***@' + dominio;
  }

  resendValidationEmail(): void {
    if (this.resendCooldown > 0 || this.isResending) return;

    this.isResending = true;
    
    this.resendService.resendValidationEmail(this.registeredEmail).subscribe({
      next: (response) => {
        const censurado = this.censurarCorreo(this.registeredEmail);
        this.utilService.showToast(`Correo reenviado exitosamente a ${censurado}.`, 'success');
        this.isResending = false;
        this.startResendCooldown();
      },
      error: (error) => {
        console.error('Error al reenviar:', error);
        
        if (error.status === 429) {
          this.utilService.showToast('Demasiados intentos: Espera un momento antes de solicitar otro reenvío.', 'warning');
        } else if (error.status === 400) {
          this.utilService.showToast('La cuenta ya está validada.', 'info');
        } else {
          this.utilService.showToast('Error al reenviar: Intenta nuevamente en unos momentos.', 'error');
        }
        
        this.isResending = false;
      }
    });
  }

  private startResendCooldown(): void {
    this.resendCooldown = 60;
    
    this.resendTimer = setInterval(() => {
      this.resendCooldown--;
      
      if (this.resendCooldown <= 0) {
        clearInterval(this.resendTimer);
        this.resendTimer = null;
      }
    }, 1000);
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  ngOnDestroy(): void {
    if (this.resendTimer) {
      clearInterval(this.resendTimer);
    }
  }
}
