import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

// Importar componentes
import { ThemeToggleComponent } from '../../components/ui/theme-toggle/theme-toggle';
import { BackButtonComponent } from '../../components/ui/back-button/back-button';
import { BrandLogoComponent } from '../../components/ui/brand-logo/brand-logo';
import { RegisterFormComponent } from '../../components/forms/register-form/register-form';
import { GlobalFooterComponent } from '../../components/ui/global-footer/global-footer';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ThemeToggleComponent,
    BackButtonComponent,
    BrandLogoComponent,
    RegisterFormComponent,
    GlobalFooterComponent
  ],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class RegisterComponent {
  
  onRegisterSuccess(email: string): void {
    console.log('Usuario registrado exitosamente:', email);
  }
}
