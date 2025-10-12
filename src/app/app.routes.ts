import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { RegisterComponent } from './pages/register/register';
import { Login } from './pages/login/login';


export const routes: Routes = [
    {path: "", component:Home},
    {path: "register", component:RegisterComponent},
    {path: "login", component:Login}

];
