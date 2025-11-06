import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { RegisterComponent } from './pages/register/register';
import { LoginComponent } from './pages/login/login';
import { ForgotComponent } from './pages/forgot/forgot';
import { DashboardComponent } from './pages/dashboard/dashboard';
import { AdminComponent } from './pages/admin/admin';
import { ValidateComponent } from './pages/validate/validate';
import { RecoverPasswordComponent } from './pages/recover-password/recover-password';
import { Error404Component } from './pages/error-404/error-404';
import { guestGuard } from './guards/guest.guard';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';
import { homeGuard } from './guards/home.guard';
import { validateGuard } from './guards/validate.guard';
import { resendGuard } from './guards/resend.guard';
import { ResendComponent } from './pages/resend/resend';

export const routes: Routes = [
    {path: "", component:Home, canActivate: [homeGuard]},
    {path: "register", component:RegisterComponent, canActivate: [guestGuard]},
    {path: "login", component:LoginComponent, canActivate: [guestGuard]},
    {path: "forgot", component:ForgotComponent},
    {path: "resend", component:ResendComponent, canActivate: [resendGuard]},
    
    // 1. Ruta de Verificación 
    {path: "validate", component:ValidateComponent, canActivate: [validateGuard]},
    
    // 2. Ruta de Reseteo 
    {path: "reset-password", component:RecoverPasswordComponent}, 
    
    {path: "dashboard", component:DashboardComponent, canActivate: [authGuard]},
    {path: "admin", component:AdminComponent, canActivate: [authGuard, adminGuard]},
    {path: "404", component:Error404Component},
    {path: "**", redirectTo: "/404"}
];