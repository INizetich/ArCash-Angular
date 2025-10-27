import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { RegisterComponent } from './pages/register/register';
import { Login } from './pages/login/login';
import { Forgot } from './pages/forgot/forgot';
import { DashboardComponent } from './pages/dashboard/dashboard';
import { AdminComponent } from './pages/admin/admin';
import { guestGuard } from './guards/guest.guard';
import { authGuard } from './guards/auth.guard';


import { adminGuard } from './guards/admin.guard';
import { homeGuard } from './guards/home.guard';


export const routes: Routes = [
    {path: "", component:Home, canActivate: [homeGuard]},
    {path: "register", component:RegisterComponent, canActivate: [guestGuard]},
    {path: "login", component:Login, canActivate: [guestGuard]},
    {path: "forgot", component:Forgot},
    {path: "dashboard", component:DashboardComponent, canActivate: [authGuard]},
    {path: "admin", component:AdminComponent, canActivate: [authGuard, adminGuard]}

];
