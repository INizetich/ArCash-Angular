import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService } from '../../services/admin-service/admin.service';
import { AdminRequest } from '../../models/admin.interface';
import { themeService } from '../../services/theme-service/theme-service';
import { UtilService } from '../../services/util-service/util-service';

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

// Validador para confirmar que los emails coinciden
export function emailMatchValidator(control: AbstractControl): ValidationErrors | null {
  const email = control.get('email')?.value;
  const confirmEmail = control.get('confirmEmail')?.value;
  return email === confirmEmail ? null : { emailMismatch: true };
}

// Validador para confirmar que las contraseñas coinciden
export function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;
  return password === confirmPassword ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin.html',
  styleUrls: ['./admin.css'],
})
export class AdminComponent implements OnInit {
  adminForm!: FormGroup;
  showPassword = false;
  showConfirmPassword = false;

  constructor(
    private adminService: AdminService,
    private fb: FormBuilder,
    private router: Router,
    private themeService: themeService,
    private utilService: UtilService
  ) {}

  ngOnInit(): void {
    this.adminForm = this.fb.group({
      name: ['', [Validators.required, Validators.pattern('[A-Za-zÁÉÍÓÚáéíóúÑñ\s]{2,50}'), Validators.minLength(2), Validators.maxLength(50)]],
      lastName: ['', [Validators.required, Validators.pattern('[A-Za-zÁÉÍÓÚáéíóúÑñ\s]{2,50}'), Validators.minLength(2), Validators.maxLength(50)]],
      dni: ['', [Validators.required, Validators.pattern('^\d{8}$')]],
      username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(10), Validators.pattern('^[a-zA-Z0-9_-]+$')]],
      emails: this.fb.group({
        email: ['', [Validators.required, Validators.email, Validators.pattern('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')]],
        confirmEmail: ['', [Validators.required, Validators.email]]
      }, { validators: emailMatchValidator }),
      passwords: this.fb.group({
        password: ['', [Validators.required, strongPasswordValidator]],
        confirmPassword: ['', [Validators.required]]
      }, { validators: passwordMatchValidator })
    });
  }

  createAdmin(): void {
    if (this.adminForm.invalid) {
      this.adminForm.markAllAsTouched();
      this.utilService.showToast("Por favor, complete todos los campos correctamente", "warning");
      return;
    }

    const formData = this.adminForm.value;
    const adminRequest: AdminRequest = {
      name: formData.name,
      lastName: formData.lastName,
      dni: formData.dni,
      email: formData.emails.email,
      username: formData.username,
      password: formData.passwords.password
    };

    this.adminService.createAdmin(adminRequest).subscribe({
      next: () => {
        this.utilService.showToast("Administrador creado exitosamente!", "success");
        this.adminForm.reset();
      },
      error: (error) => {
        let errorMessage = "Error al crear el administrador";
        if (error.error?.message) {
          errorMessage = error.error.message;
        }
        this.utilService.showToast(errorMessage, "error");
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
    this.adminForm.get('dni')?.setValue(value);
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  toogleTheme() {
    this.themeService.toggleTheme();
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }
}