import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService } from '../../services/admin-service/admin.service';
import { UserResponse, AdminRequest } from '../../models/admin.interface';
import { themeService } from '../../services/theme-service/theme-service';
import { UtilService } from '../../services/util-service/util-service';



@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin.html',
  styleUrls: ['./admin.css']
})
export class AdminComponent implements OnInit {
  users: UserResponse[] = [];
  showUsersList = false;
  showAdminForm = false;
  loading = false;
  selectedUser: UserResponse | null = null;
  showModal = false;
  
  adminForm: FormGroup;
  formMessage = '';
  formMessageColor = '';
  passwordMismatch = false;

  constructor(
    private adminService: AdminService,
    private fb: FormBuilder,
    private router: Router,
    private themeService : themeService,
    private utilService : UtilService
  ) {
    this.adminForm = this.createAdminForm();
  }

  

  ngOnInit(): void {
    this.checkAdminAccess();
    this.setupPasswordValidation();
  }

  toogleTheme(){
    this.themeService.toggleTheme()
  }

  private createAdminForm(): FormGroup {
    return this.fb.group({
      name: ['', [
        Validators.required, 
        Validators.pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{2,}$/),
        Validators.maxLength(50)
      ]],
      lastName: ['', [
        Validators.required, 
        Validators.pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{2,}$/),
        Validators.maxLength(50)
      ]],
      dni: ['', [
        Validators.required, 
        Validators.pattern(/^\d{8}$/),
        Validators.maxLength(8)
      ]],
      email: ['', [
        Validators.required, 
        Validators.email,
        Validators.maxLength(50)
      ]],
      username: ['', [
        Validators.required,
        Validators.maxLength(10)
      ]],
      password: ['', [
        Validators.required,
        Validators.minLength(6)
      ]],
      confirmPassword: ['', [Validators.required]]
    });
  }

  private setupPasswordValidation(): void {
    const passwordControl = this.adminForm.get('password');
    const confirmPasswordControl = this.adminForm.get('confirmPassword');

    if (passwordControl && confirmPasswordControl) {
      confirmPasswordControl.valueChanges.subscribe(() => {
        this.checkPasswordMatch();
      });

      passwordControl.valueChanges.subscribe(() => {
        this.checkPasswordMatch();
      });
    }
  }

  private checkPasswordMatch(): void {
    const password = this.adminForm.get('password')?.value;
    const confirmPassword = this.adminForm.get('confirmPassword')?.value;
    
    if (password && confirmPassword && password.length >= 6 && confirmPassword.length >= 6) {
      this.passwordMismatch = password !== confirmPassword;
    } else {
      this.passwordMismatch = false;
    }
  }

  private async checkAdminAccess(): Promise<void> {
    const token = localStorage.getItem('JWT');
    const role = localStorage.getItem('role');

    if (!token) {
      this.router.navigate(['/login']);
      return;
    }

    if (role !== 'ADMIN') {
      this.router.navigate(['/dashboard']);
      return;
    }

    try {
      await this.adminService.checkAccess().toPromise();
    } catch (error: any) {
      console.error('Error al verificar acceso de admin:', error);
      
      // Solo redirigir al dashboard si es un error de permisos (403/401)
      // Si es error de conexión (status 0), permitir quedarse pero mostrar aviso
      if (error.status === 403 || error.status === 401) {
        this.router.navigate(['/dashboard']);
      } else if (error.status === 0) {
        this.utilService.showToast('Advertencia: No se puede verificar conexión con el servidor', 'error');
      }
    }
  }

  async loadUsers(): Promise<void> {
    this.showAdminForm = false;
    this.showUsersList = true;
    
    // Primero mostrar datos del cache si existen
    const cachedUsers = this.adminService.getCachedUsers();
    if (cachedUsers) {
      this.users = cachedUsers;
    } else {
      this.loading = true;
      this.users = [];
    }

    try {
      const users = await this.adminService.getAuthenticatedUsers().toPromise();
      if (users) {
        this.users = users;
        this.adminService.cacheUsers(users);
      }
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
      if (!cachedUsers) {
        this.users = [];
      }
    } finally {
      this.loading = false;
    }
  }

  showCreateAdminForm(): void {
    this.showUsersList = false;
    this.showAdminForm = true;
    this.adminForm.reset();
    this.formMessage = '';
    this.passwordMismatch = false;
  }

  cancelAdminForm(): void {
    this.showAdminForm = false;
    this.showUsersList = true;
    this.adminForm.reset();
    this.formMessage = '';
    this.passwordMismatch = false;
  }

  async toggleUserStatus(userId: number, currentStatus: boolean): Promise<void> {
    const action = currentStatus ? 'inhabilitar' : 'habilitar';
    const confirmed = confirm(`¿Seguro que quieres ${action} este usuario?`);
    
    if (!confirmed) return;

    try {
      let response = '';
      if (currentStatus) {
        response = (await this.adminService.disableUser(userId).toPromise()) ?? '';
      } else {
        response = (await this.adminService.enableUser(userId).toPromise()) ?? '';
      }
      // Actualizar el estado en la lista local y refrescar el botón
      const user = this.users.find(u => u.id === userId);
      if (user) user.active = !currentStatus;
      this.utilService.showToast(response || `Usuario ${action} correctamente`, 'success');
      // Forzar actualización visual (Angular detecta el cambio automáticamente)
    } catch (error) {
      console.error(`Error al ${action} usuario:`, error);
      this.utilService.showToast(`Error al ${action} usuario`, 'error');
    }
  }

  async createAdmin(): Promise<void> {
    if (this.adminForm.invalid || this.passwordMismatch) {
      this.showFormMessage('Por favor, completa todos los campos correctamente.', 'red');
      return;
    }

    const formData = this.adminForm.value as AdminRequest;
    this.showFormMessage('Procesando...', 'blue');

    try {
      const response = (await this.adminService.createAdmin(formData).toPromise()) ?? '';
      this.showFormMessage(response || 'Administrador creado correctamente.', 'green');
      this.adminForm.reset();
      this.passwordMismatch = false;
      this.utilService.showToast(response || 'Administrador creado correctamente', 'success');
      // Actualizar la lista de usuarios automáticamente
      await this.loadUsers();
    } catch (error: any) {
      const errorMessage = error?.error?.mensaje || error?.message || 'Error al crear administrador';
      this.showFormMessage(`Error: ${errorMessage}`, 'red');
      this.utilService.showToast(errorMessage, 'error');
    }
  }

  showUserDetails(user: UserResponse): void {
    this.selectedUser = user;
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedUser = null;
  }

  goBack(): void {
    window.history.back();
  }

  private showFormMessage(message: string, color: string): void {
    this.formMessage = message;
    this.formMessageColor = color;
  }

}
