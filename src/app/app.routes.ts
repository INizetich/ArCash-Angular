import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { RegisterComponent } from './pages/register/register';
import { Login } from './pages/login/login';
import { Forgot } from './pages/forgot/forgot';
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
    {path: "login", component:Login, canActivate: [guestGuard]},
    {path: "forgot", component:Forgot},
<<<<<<< Updated upstream
    {path: "resend", component:ResendComponent, canActivate: [resendGuard]}, // Solo accesible desde navegación interna
    {path: "validate", component:ValidateComponent, canActivate: [validateGuard]}, // Solo accesible desde email con token
    {path: "validate-request", component:RecoverPasswordComponent}, // Ruta del email para reset password
    {path: "reset-password", component:RecoverPasswordComponent}, // Alias para consistencia
=======
    {path: "validate", component:ValidateComponent}, // Solo accesible desde email
    {path: "reset-password", component:RecoverPasswordComponent}, // Solo accesible desde email
>>>>>>> Stashed changes
    {path: "dashboard", component:DashboardComponent, canActivate: [authGuard]},
    {path: "admin", component:AdminComponent, canActivate: [authGuard, adminGuard]},
    {path: "404", component:Error404Component}, // Página de error
    {path: "**", redirectTo: "/404"} // Ruta wildcard para cualquier URL no encontrada

];
