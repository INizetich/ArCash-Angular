import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { AdminService } from '../../services/admin-service/admin.service';
import { AdminRequest, UserResponse } from '../../models/admin.interface';
import { UtilService } from '../../services/util-service/util-service';
import { BackButtonComponent } from "../../components/ui/back-button/back-button";
import { ThemeToggleComponent } from "../../components/ui/theme-toggle/theme-toggle";
import { BrandLogoComponent } from "../../components/ui/brand-logo/brand-logo";
import { AuthenticatedInfoComponent } from '../../components/ui/authenticated-info/authenticated-info';

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
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    BackButtonComponent, 
    ThemeToggleComponent, 
    BrandLogoComponent, 
    AuthenticatedInfoComponent
  ],
  templateUrl: './admin.html',
  styleUrls: ['./admin.css'],
})
export class AdminComponent implements OnInit {
  adminForm!: FormGroup;
  showPassword = false;
  showConfirmPassword = false;
  
  // Variable para controlar el estado de carga del formulario
  loading = false;
  
  // Nueva lógica para vistas
  currentView: 'main' | 'create-admin' | 'users-list' = 'main';
  users: UserResponse[] = [];
  isLoadingUsers = false;
  usersAlreadyLoaded = false; // Nueva variable para controlar si ya se cargaron los usuarios
  selectedUser: UserResponse | null = null;
  showUserModal = false;
  showConfirmModal = false;
  userToToggle: UserResponse | null = null;
  currentUserId: number = 0;

  // Nueva variable para controlar carga de botones
  loadingUserAction: number | null = null; // ID del usuario que se está procesando

  constructor(
    private adminService: AdminService,
    private fb: FormBuilder,
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

    // Obtener el ID del usuario actual - múltiples fuentes y métodos
    this.getCurrentUserId();
  }

  // Método para obtener el ID del usuario actual
  private getCurrentUserId(): void {
    // Verificar todas las fuentes posibles
    const userDataString = localStorage.getItem('userData');
    const userIdString = localStorage.getItem('userId');
    const accountIdString = localStorage.getItem('accountId');
  
    // Intentar desde userData
    if (userDataString) {
      try {
        const userData = JSON.parse(userDataString);
        this.currentUserId = userData.id || userData.userId || userData.accountId || 0;
        if (this.currentUserId > 0) {
          return;
        }
      } catch (e) {
        console.warn('Error parsing userData from localStorage:', e);
      }
    }
    
    // Intentar desde userId directo
    if (userIdString) {
      this.currentUserId = parseInt(userIdString, 10) || 0;
      if (this.currentUserId > 0) {
        return;
      }
    }
    
    // Intentar desde accountId como fallback
    if (accountIdString) {
      this.currentUserId = parseInt(accountIdString, 10) || 0;
      if (this.currentUserId > 0) {
        return;
      }
    }
    
    console.warn('No se pudo obtener el ID del usuario actual');
    this.currentUserId = 0;
  }

  createAdmin(): void {
  if (this.adminForm.invalid) {
    this.adminForm.markAllAsTouched();
    this.utilService.showToast("Formulario incompleto: Revisa y completa todos los campos marcados en rojo.", "warning");
    return;
  }

  // Evitar múltiples envíos si ya se está procesando
  if (this.loading) {
    return;
  }

  // Establecer estado de carga
  this.loading = true;

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
      this.loading = false;
      
      // Mensaje de éxito más específico
      const emailCensurado = this.censurarCorreo(adminRequest.email);
      this.utilService.showToast(
        `¡Administrador creado exitosamente! Se ha creado la cuenta para ${adminRequest.name} ${adminRequest.lastName} (${emailCensurado}) con permisos de administrador.`, 
        "success"
      );
      
      this.adminForm.reset();
    },
    error: (error) => {
      this.loading = false;
      console.error('Error en creación de admin:', error);
      
      // Buscar el mensaje tanto en 'message' como en 'mensaje'
      const backendMessage = error.error?.mensaje || error.error?.message;
      const campo = error.error?.campo;
      
      // Manejo específico de errores del backend
      if (backendMessage) {
        // Manejar errores específicos de conflictos con mensajes más descriptivos
        if (backendMessage.includes("email ya se encuentra en uso")) {
          const emailCensurado = this.censurarCorreo(adminRequest.email);
          this.utilService.showToast(
            `El correo ${emailCensurado} ya está registrado en el sistema. Por favor, utiliza otro correo electrónico.`, 
            "warning"
          );
        } else if (backendMessage.includes("nombre de usuario no está disponible")) {
          this.utilService.showToast(
            `El nombre de usuario "${adminRequest.username}" no está disponible. Por favor, elige otro nombre de usuario.`, 
            "warning"
          );
        } else if (backendMessage.includes("DNI ya está registrado")) {
          this.utilService.showToast(
            `El DNI ${adminRequest.dni} ya está registrado en el sistema. Verifica los datos e intenta nuevamente.`, 
            "warning"
          );
        } else if (backendMessage.includes("campos son obligatorios")) {
          this.utilService.showToast("Todos los campos son obligatorios para crear un administrador.", "warning");
        } else {
          // Para otros mensajes del servidor, mostrarlos tal como vienen
          this.utilService.showToast(`Error al crear administrador: ${backendMessage}`, "error");
        }
      } else {
        // Manejo de errores por código de estado
        if (error.status === 400) {
          this.utilService.showToast(
            "Datos inválidos: Revisa que todos los campos tengan el formato correcto y que las contraseñas coincidan.", 
            "warning"
          );
        } else if (error.status === 403) {
          this.utilService.showToast(
            "Acceso denegado: No tienes permisos suficientes para crear administradores.", 
            "error"
          );
        } else if (error.status === 409) {
          this.utilService.showToast(
            "Conflicto: Los datos ingresados ya existen en el sistema.", 
            "warning"
          );
        } else if (error.status >= 500) {
          this.utilService.showToast(
            "Error del servidor: No se pudo crear el administrador en este momento. Intenta nuevamente en unos minutos.", 
            "error"
          );
        } else if (error.status === 0 || !navigator.onLine) {
          this.utilService.showToast(
            "Sin conexión: Verifica tu conexión a internet e intenta crear el administrador nuevamente.", 
            "warning"
          );
        } else {
          this.utilService.showToast(
            "Error inesperado: No se pudo crear el administrador. Verifica los datos e intenta nuevamente.", 
            "error"
          );
        }
      }
    }
  });
}

  // Método para censurar correo (similar al del register)
  private censurarCorreo(email: string): string {
    const [usuario, dominio] = email.split('@');
    if (usuario.length <= 2) {
      return usuario[0] + '***@' + dominio;
    }
    const visible = usuario.slice(0, 2);
    return visible + '***@' + dominio;
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

  // ===== NUEVOS MÉTODOS PARA LA FUNCIONALIDAD ADMIN =====

  // Navegación entre vistas
  showCreateAdminView(): void {
    this.currentView = 'create-admin';
  }

  showUsersListView(): void {
    this.currentView = 'users-list';
    
    // Solo cargar usuarios si es la primera vez
    if (!this.usersAlreadyLoaded) {
      this.loadUsers();
    }
  }

  showMainView(): void {
    this.currentView = 'main';
    this.selectedUser = null;
    this.showUserModal = false;
  }

  // Cargar usuarios autenticados
  loadUsers(forceReload: boolean = false): void {
    // Si ya se cargaron y no es forzado, usar timeout corto para mejor UX
    if (this.usersAlreadyLoaded && !forceReload) {
      this.isLoadingUsers = true;
      
      // Timeout corto solo para mostrar feedback visual mínimo
      setTimeout(() => {
        this.isLoadingUsers = false;
      }, 150);
      return;
    }

    this.isLoadingUsers = true;
    
    // Verificar que tenemos el ID del usuario actual
    if (this.currentUserId === 0) {
      this.getCurrentUserId();
    }
    
    this.adminService.getAuthenticatedUsers().subscribe({
      next: (users) => {
        // Filtrar para excluir al usuario actual
        this.users = users.filter(user => {
          // Múltiples comparaciones para asegurar exclusión
          const isCurrentUserById = user.id === this.currentUserId;
          const isCurrentUserByIdAccount = user.idAccount === this.currentUserId;
          const isCurrentUserByStringComparison = Number(user.id) === this.currentUserId;
          
          const shouldExclude = isCurrentUserById || isCurrentUserByIdAccount || isCurrentUserByStringComparison;
          return !shouldExclude;
        });
            
        this.adminService.cacheUsers(this.users);
        this.usersAlreadyLoaded = true; // Marcar como cargados
        this.isLoadingUsers = false;
      },
      error: (error) => {
        console.error('Error al cargar usuarios:', error);
        this.utilService.showToast("Error al cargar usuarios", "error");
        this.isLoadingUsers = false;
        
        // Intentar cargar desde cache si hay error
        const cachedUsers = this.adminService.getCachedUsers();
        if (cachedUsers) {
          this.users = cachedUsers.filter(user => {
            const isCurrentUserById = user.id === this.currentUserId;
            const isCurrentUserByIdAccount = user.idAccount === this.currentUserId;
            const isCurrentUserByNumeric = Number(user.id) === this.currentUserId;
            return !(isCurrentUserById || isCurrentUserByIdAccount || isCurrentUserByNumeric);
          });
        }
      }
    });
  }

  // Modal de usuario - VERSIÓN OPTIMIZADA
  openUserModal(user: UserResponse): void {
    // Usar requestAnimationFrame para mejor performance
    requestAnimationFrame(() => {
      this.selectedUser = user;
      this.showUserModal = true;
    });
  }

  closeUserModal(): void {
    this.showUserModal = false;
    // No resetear selectedUser inmediatamente - esperar a que la animación termine
    setTimeout(() => {
      this.selectedUser = null;
    }, 150); // Solo 150ms para coincidir con la duración de la animación CSS
  }

  resetUserModal(): void {
    this.showUserModal = false;
    this.selectedUser = null;
  }

  onToggleUserStatus(user: UserResponse): void {
    // Cerrar inmediatamente sin animación para mejor respuesta
    this.resetUserModal();
    this.openConfirmModal(user);
  }

  // Modal de confirmación personalizado
  openConfirmModal(user: UserResponse): void {
    this.userToToggle = user;
    this.showConfirmModal = true;
  }

  closeConfirmModal(): void {
    this.userToToggle = null;
    this.showConfirmModal = false;
    this.loadingUserAction = null; // Resetear estado de carga al cerrar
  }

  // Confirmar cambio de estado
  confirmToggleUser(): void {
    if (!this.userToToggle) return;

    const user = this.userToToggle;
    const action = user.active ? 'deshabilitar' : 'habilitar';
    
    // Activar estado de carga
    this.loadingUserAction = user.id;

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
        
        // Forzar recarga para reflejar cambios
        this.usersAlreadyLoaded = false;
        
        // Resetear estado de carga
        this.loadingUserAction = null;
        
        this.closeConfirmModal();
        this.resetUserModal();
      },
      error: (error) => {
        console.error(`Error al ${action} usuario:`, error);
        this.utilService.showToast(`Error al ${action} usuario`, "error");
        
        // Resetear estado de carga en caso de error
        this.loadingUserAction = null;
        this.closeConfirmModal();
      }
    });
  }

  // Método para refrescar manualmente la lista de usuarios
  refreshUsersList(): void {
    this.usersAlreadyLoaded = false;
    this.loadUsers(true);
  }
}