import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ResendService } from '../../services/resend-service/resend.service';
import { UtilService } from '../../services/util-service/util-service';

// Importar componentes
import { ThemeToggleComponent } from '../../components/ui/theme-toggle/theme-toggle';
import { BackButtonComponent } from '../../components/ui/back-button/back-button';
import { BrandLogoComponent } from '../../components/ui/brand-logo/brand-logo';
import { GlobalFooterComponent } from '../../components/ui/global-footer/global-footer';

@Component({
  selector: 'app-resend',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule,
    ThemeToggleComponent,
    BackButtonComponent,
    BrandLogoComponent,
    GlobalFooterComponent
  ],
  templateUrl: './resend.html',
  styleUrls: ['./resend.css']
})
export class ResendComponent implements OnInit {
  resendForm!: FormGroup;
  isLoading = false;
  currentView: 'main' | 'validation' | 'password-recovery' = 'main';

  constructor(
    private fb: FormBuilder,
    private resendService: ResendService,
    private utilService: UtilService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.resendForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  // Métodos de navegación entre vistas
  showValidationView(): void {
    this.currentView = 'validation';
  }

  showPasswordRecoveryView(): void {
    this.currentView = 'password-recovery';
  }

  goBackToMain(): void {
    this.currentView = 'main';
  }

  // Envío de emails de validación
  async sendValidationEmail(): Promise<void> {
    if (this.resendForm.invalid) {
      this.resendForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const email = this.resendForm.get('email')?.value;

    try {
      await this.resendService.resendValidationEmail(email);
      this.utilService.showToast('Email de validación reenviado correctamente', 'success');
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 2000);
    } catch (error) {
      this.utilService.showToast('Error al reenviar email de validación', 'error');
    } finally {
      this.isLoading = false;
    }
  }

  // Envío de emails de recuperación de contraseña
  async sendPasswordRecoveryEmail(): Promise<void> {
    if (this.resendForm.invalid) {
      this.resendForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const email = this.resendForm.get('email')?.value;

    try {
      await this.resendService.resendPasswordRecovery(email);
      this.utilService.showToast('Email de recuperación enviado correctamente', 'success');
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 2000);
    } catch (error) {
      this.utilService.showToast('Error al enviar email de recuperación', 'error');
    } finally {
      this.isLoading = false;
    }
  }

  // Navegación
  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  goToRegister(): void {
    this.router.navigate(['/register']);
  }
}
