import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // Necesario para directivas como *ngIf
import { 
  ReactiveFormsModule, 
  FormBuilder,           // Para construir el formulario de forma sencilla
  FormGroup,             // El tipo de dato para nuestro formulario
  Validators,            // Contiene los validadores estándar (required, email, etc.)
  AbstractControl,       // Requerido para crear validadores personalizados
  ValidationErrors       // El tipo de dato que retorna un validador con error
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth-service/auth-service';
import { themeService } from '../../services/theme-service/theme-service';
import { UtilService } from '../../services/util-service/util-service';

// --- VALIDADORES PERSONALIZADOS ---
// Esta función comprueba que las dos contraseñas coincidan.
export function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;

  // Si las contraseñas no coinciden, retornamos un objeto de error. Si coinciden, retornamos null.
  return password === confirmPassword ? null : { passwordMismatch: true };
}

// Esta función comprueba que los dos emails coincidan.
export function emailMatchValidator(control: AbstractControl): ValidationErrors | null {
  const email = control.get('email')?.value;
  const confirmEmail = control.get('confirmEmail')?.value;

  // Si los emails no coinciden, retornamos un objeto de error. Si coinciden, retornamos null.
  return email === confirmEmail ? null : { emailMismatch: true };
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
  selector: 'app-register',
  standalone: true, // Marcamos el componente como independiente
  imports: [
    CommonModule, // Importamos CommonModule
    ReactiveFormsModule, // Importamos ReactiveFormsModule,
    RouterLink
],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class RegisterComponent implements OnInit { // Implementamos OnInit para usar el ciclo de vida

  // Declaramos la propiedad que contendrá nuestro formulario.
  // El '!' indica a TypeScript que estamos seguros de que esta propiedad se inicializará más tarde (en ngOnInit).
  registerForm!: FormGroup;

  // Variables para mostrar/ocultar contraseñas
  showPassword = false;
  showConfirmPassword = false;

  // --- CONSTRUCTOR ---
  // Inyectamos el 'FormBuilder' (fb) para poder usarlo. Angular se encarga de proveerlo.
  constructor(private fb: FormBuilder,private utilService : UtilService, private authService : AuthService, private themeService : themeService, private router: Router) {}

  // --- CICLO DE VIDA ngOnInit ---
  // Este método se ejecuta automáticamente una vez que el componente se ha inicializado.
  // Es el lugar perfecto para definir la estructura de nuestro formulario.
  ngOnInit(): void {

    this.registerForm = this.fb.group({
      // Definimos cada control con su valor inicial y sus validadores.
      nombre: ['', [Validators.required, Validators.pattern('[A-Za-zÁÉÍÓÚáéíóúÑñ\\s]{2,50}'), Validators.minLength(2), Validators.maxLength(50)]],
      apellido: ['', [Validators.required, Validators.pattern('[A-Za-zÁÉÍÓÚáéíóúÑñ\\s]{2,50}'), Validators.minLength(2), Validators.maxLength(50)]],
      dni: ['', [Validators.required, Validators.pattern('^\\d{8}$'), Validators.minLength(8), Validators.maxLength(8)]],
      alias: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(10), Validators.pattern('^[a-zA-Z0-9_-]+$')]],
      
      // Creamos un grupo anidado para los emails para poder aplicarles un validador conjunto.
      emails: this.fb.group({
        email: ['', [Validators.required, Validators.email, Validators.pattern('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$')]],
        confirmEmail: ['', [Validators.required, Validators.email]]
      }, { 
        validators: emailMatchValidator // Aplicamos nuestro validador personalizado a este grupo.
      }),
      
      // Creamos un grupo anidado para las contraseñas para poder aplicarles un validador conjunto.
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

    
  }

  // --- MÉTODO DE ENVÍO ---
  // Este método se llamará desde el HTML cuando el formulario se envíe.
  onSubmit(): void {
    // Si el formulario es inválido, marcamos todos los campos como "tocados" para mostrar los errores y detenemos la ejecución.
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      this.utilService.showToast("Formulario incompleto: Revisa y completa todos los campos marcados en rojo.", "warning");
      return;
    }

    // Preparar los datos para enviar al backend
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
        next: () => {
          this.utilService.showToast("Registro exitoso Bienvenido a ArCash", "success");
          this.registerForm.reset();
          
          // Redirigir al login después de 2 segundos
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 2000);
        },
        error: (error) => {
          console.error('Error en registro:', error);
          
          // Manejo inteligente de errores con colores apropiados
          if (error.status === 409 || error.error?.message?.includes("ya existe") || error.error?.message?.includes("ya está en uso")) {
            if (error.error.message?.includes("email")) {
              this.utilService.showToast("El email ya se encuentra en uso", "warning");
            } else if (error.error.message?.includes("alias")) {
              this.utilService.showToast("Nombre de usuario no disponible", "warning");
            } 
          } else if (error.status === 400) {
            this.utilService.showToast("Datos inválidos: Revisa que todos los campos tengan el formato correcto.", "warning");
          } else if (error.status >= 500) {
            this.utilService.showToast("Error del servidor: Intenta registrarte nuevamente en unos momentos.", "error");
          } else if (error.status === 0 || !navigator.onLine) {
            this.utilService.showToast("Sin conexión: Verifica tu conexión a internet e intenta nuevamente.", "warning");
          } else {
            this.utilService.showToast("Error inesperado: No se pudo completar el registro. Intenta nuevamente.", "error");
          }
        }
      })
  }

  toggleTheme(){
    this.themeService.toggleTheme();
  }

  goBack(){
    this.utilService.goBack()
  }

  // Método para filtrar solo números en el input del DNI
  onDniInput(event: any): void {
    const input = event.target;
    let value = input.value;
    
    // Remover todo lo que no sea dígito
    value = value.replace(/\D/g, '');
    
    // Limitar a 8 dígitos
    if (value.length > 8) {
      value = value.substring(0, 8);
    }
    
    // Actualizar el valor del input y el control del formulario
    input.value = value;
    this.registerForm.get('dni')?.setValue(value);
  }

  // Métodos para mostrar/ocultar contraseñas
  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }
}