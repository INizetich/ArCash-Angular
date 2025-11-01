import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService } from '../../services/admin-service/admin.service';
import { AdminRequest, UserResponse } from '../../models/admin.interface';
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
  
  // Nueva lógica para vistas
  currentView: 'main' | 'create-admin' | 'users-list' = 'main';
  users: UserResponse[] = [];
  isLoadingUsers = false;
  selectedUser: UserResponse | null = null;
  showUserModal = false;
  showConfirmModal = false;
  userToToggle: UserResponse | null = null;
  currentUserId: number = 0;

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
      dni: ['', [Validators.required, Validators.pattern('^\\d{8}$'), Validators.minLength(8), Validators.maxLength(8)]],
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

    // Obtener el ID del usuario actual desde localStorage - múltiples fuentes
    const userDataString = localStorage.getItem('userData');
    const userIdString = localStorage.getItem('userId');
    
    if (userDataString) {
      try {
        const userData = JSON.parse(userDataString);
        this.currentUserId = userData.id || userData.userId || 0;
      } catch (e) {
        console.warn('Error parsing userData from localStorage');
      }
    } else if (userIdString) {
      this.currentUserId = parseInt(userIdString, 10) || 0;
    }
    
    console.log('Current User ID:', this.currentUserId); // Para debug
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

  // ===== NUEVOS MÉTODOS PARA LA FUNCIONALIDAD ADMIN =====

  // Navegación entre vistas
  showCreateAdminView(): void {
    this.currentView = 'create-admin';
  }

  showUsersListView(): void {
    this.currentView = 'users-list';
    this.loadUsers();
  }

  showMainView(): void {
    this.currentView = 'main';
    this.selectedUser = null;
    this.showUserModal = false;
  }

  // Cargar usuarios autenticados
  loadUsers(): void {
    this.isLoadingUsers = true;
    
    this.adminService.getAuthenticatedUsers().subscribe({
      next: (users) => {
        console.log('Usuarios recibidos:', users);
        console.log('ID usuario actual:', this.currentUserId);
        
        // Filtrar para excluir al usuario actual
        this.users = users.filter(user => user.id !== this.currentUserId);
        console.log('Usuarios después del filtro:', this.users);
        
        this.adminService.cacheUsers(this.users);
        this.isLoadingUsers = false;
      },
      error: (error) => {
        console.error('Error al cargar usuarios:', error);
        this.utilService.showToast("Error al cargar usuarios", "error");
        this.isLoadingUsers = false;
        
        // Intentar cargar desde cache si hay error
        const cachedUsers = this.adminService.getCachedUsers();
        if (cachedUsers) {
          this.users = cachedUsers.filter(user => user.id !== this.currentUserId);
        }
      }
    });
  }

  // Modal de usuario
  openUserModal(user: UserResponse): void {
    this.selectedUser = user;
    this.showUserModal = true;
  }

  closeUserModal(): void {
    this.selectedUser = null;
    this.showUserModal = false;
  }

  // Modal de confirmación personalizado
  openConfirmModal(user: UserResponse): void {
    this.userToToggle = user;
    this.showConfirmModal = true;
  }

  closeConfirmModal(): void {
    this.userToToggle = null;
    this.showConfirmModal = false;
  }

  // Confirmar cambio de estado
  confirmToggleUser(): void {
    if (!this.userToToggle) return;

    const user = this.userToToggle;
    const action = user.active ? 'deshabilitar' : 'habilitar';
    
    const serviceCall = user.active 
      ? this.adminService.disableUser(user.id)
      : this.adminService.enableUser(user.id);

    serviceCall.subscribe({
      next: () => {
        // Actualizar estado local
        user.active = !user.active;
        
        // Actualizar cache
        this.adminService.updateUserInCache(user.id, user.active);
        
        this.utilService.showToast(
          `Usuario ${action === 'deshabilitar' ? 'deshabilitado' : 'habilitado'} exitosamente`, 
          "success"
        );
        
        this.closeConfirmModal();
        this.closeUserModal();
      },
      error: (error) => {
        console.error(`Error al ${action} usuario:`, error);
        this.utilService.showToast(`Error al ${action} usuario`, "error");
        this.closeConfirmModal();
      }
    });
  }
}