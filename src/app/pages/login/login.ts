import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ThemeToggleComponent } from '../../components/ui/theme-toggle/theme-toggle';
import { BackButtonComponent } from '../../components/ui/back-button/back-button';
import { BrandLogoComponent } from '../../components/ui/brand-logo/brand-logo';
import { LoginFormComponent } from '../../components/forms/login-form/login-form';
import { GlobalFooterComponent } from '../../components/ui/global-footer/global-footer';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ThemeToggleComponent,
    BackButtonComponent,
    BrandLogoComponent,
    LoginFormComponent,
    GlobalFooterComponent
  ],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent {

  constructor(private router: Router) {}

  onLoginSuccess(userData: any): void {
    this.router.navigate(['/dashboard']);
  }
}
