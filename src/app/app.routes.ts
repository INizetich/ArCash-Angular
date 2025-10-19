import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { RegisterComponent } from './pages/register/register';
import { Login } from './pages/login/login';
import { Forgot } from './pages/forgot/forgot';
import { DashboardComponent } from './pages/dashboard/dashboard';
import { AdminComponent } from './pages/admin/admin';


export const routes: Routes = [
    {path: "", component:Home},
    {path: "register", component:RegisterComponent},
    {path: "login", component:Login},
    {path: "forgot", component:Forgot},
    {path: "dashboard", component:DashboardComponent},
    {path: "admin", component:AdminComponent}

];
