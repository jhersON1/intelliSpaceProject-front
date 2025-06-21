import { Routes } from '@angular/router';
import { isNotAuthenticatedGuard } from './guards';

export const authRoutes = [
    {
        path: 'login',
        loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent),
        canActivate: [isNotAuthenticatedGuard]
    },
    {
        path: 'register',
        loadComponent: () => import('./pages/register/register.component').then(m => m.RegisterComponent),
        canActivate: [isNotAuthenticatedGuard]
    },
]