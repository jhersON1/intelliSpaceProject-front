import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: 'home',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
    },
    {
        path: '',
        loadChildren: () => import('./auth/auth.routes').then(m => m.authRoutes),
    },
    {
        path: '**',
        redirectTo: 'home',
    }
];
