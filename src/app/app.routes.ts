import { Routes } from '@angular/router';
import { isAuthenticatedGuard } from './auth/guards';

export const routes: Routes = [
    {
        path: 'home',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
    },
    {
        path: '',
        loadChildren: () => import('./auth/auth.routes').then(m => m.authRoutes),
        canActivate: [isAuthenticatedGuard]
    },
    {
        path: '**',
        redirectTo: 'home',
        pathMatch: 'full'
    }
];
