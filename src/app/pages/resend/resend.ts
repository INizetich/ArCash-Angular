import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ResendService } from '../../services/resend-service/resend.service';
import { themeService } from '../../services/theme-service/theme-service';
import { UtilService } from '../../services/util-service/util-service';

@Component({
  selector: 'app-resend',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
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
    private themeService: themeService,
    private utilService: UtilService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.resendForm = this.fb.group({
      email: ['', [Validators.required, Validators.email, Validators.pattern('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$')]]
    });
  }

  showValidationView(): void {
    this.currentView = 'validation';
    this.resendForm.reset();
  }

  showPasswordRecoveryView(): void {
    this.currentView = 'password-recovery';
    this.resendForm.reset();
  }

  showMainView(): void {
    this.currentView = 'main';
    this.resendForm.reset();
  }

  onSubmitValidation(): void {
    if (this.resendForm.invalid) {
      this.resendForm.markAllAsTouched();
      this.utilService.showToast('Por favor, ingresa un email válido.', 'warning');
      return;
    }

    if (this.isLoading) {
      return;
    }

    this.isLoading = true;
    const email = this.resendForm.get('email')?.value;

    this.resendService.resendValidationEmail(email).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success) {
          this.utilService.showToast(response.message, 'success');
          this.resendForm.reset();
          
          // Redirigir al login después de 3 segundos
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 3000);
        } else {
          this.utilService.showToast(response.message, 'error');
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error al reenviar validación:', error);
        
        const backendMessage = error.error?.message || error.error?.mensaje;
        if (backendMessage) {
          this.utilService.showToast(backendMessage, 'error');
        } else {
          this.utilService.showToast('Error al reenviar el enlace. Inténtalo de nuevo.', 'error');
        }
      }
    });
  }

  onSubmitPasswordRecovery(): void {
    if (this.resendForm.invalid) {
      this.resendForm.markAllAsTouched();
      this.utilService.showToast('Por favor, ingresa un email válido.', 'warning');
      return;
    }

    if (this.isLoading) {
      return;
    }

    this.isLoading = true;
    const email = this.resendForm.get('email')?.value;

    this.resendService.resendPasswordRecovery(email).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success) {
          this.utilService.showToast(response.message, 'success');
          this.resendForm.reset();
          
          // Redirigir al login después de 3 segundos
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 3000);
        } else {
          this.utilService.showToast(response.message, 'error');
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error al reenviar recuperación:', error);
        
        const backendMessage = error.error?.message || error.error?.mensaje;
        if (backendMessage) {
          this.utilService.showToast(backendMessage, 'error');
        } else {
          this.utilService.showToast('Error al reenviar el enlace. Inténtalo de nuevo.', 'error');
        }
      }
    });
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  goBack(): void {
    this.utilService.goBack();
  }
}
