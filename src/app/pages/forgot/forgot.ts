import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ThemeToggleComponent } from '../../components/ui/theme-toggle/theme-toggle';
import { BackButtonComponent } from '../../components/ui/back-button/back-button';
import { BrandLogoComponent } from '../../components/ui/brand-logo/brand-logo';
import { ForgotPasswordFormComponent } from '../../components/forms/forgot-password-form/forgot-password-form';
import { GlobalFooterComponent } from '../../components/ui/global-footer/global-footer';
import { UtilService } from '../../services/util-service/util-service';

@Component({
  selector: 'app-forgot',
  standalone: true,
  imports: [
    FormsModule,
    CommonModule,
    ThemeToggleComponent,
    BackButtonComponent,
    BrandLogoComponent,
    ForgotPasswordFormComponent,
    GlobalFooterComponent
  ],
  templateUrl: './forgot.html',
  styleUrls: ['./forgot.css']
})
export class ForgotComponent  {
  
  constructor(private utilService : UtilService){}

  onEmailSent(){
    this.utilService.showToast("Correo reenviado correctamente!", 'info')
  }
}
