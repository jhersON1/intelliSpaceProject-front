import { Routes } from '@angular/router';
import { isAuthenticatedGuard } from './auth/guards';

export const routes: Routes = [
    {
        path: 'home',
        loadChildren: () => import('./features/features.route').then(m => m.featureRoutes),
    },
    {
        path: 'auth',
        loadChildren: () => import('./auth/auth.routes').then(m => m.authRoutes),
        // No usar guard aquí - las rutas individuales de auth manejan sus propios guards
    },
    {
        path: 'admin',
        loadChildren: () => import('./admin/admin.routes').then(m => m.adminRoutes),
    },
    {
        path: 'terms-and-conditions',
        loadComponent: () => import('./shared/pages/terms-and-conditions/terms-and-conditions.component').then(m => m.TermsAndConditionsComponent),
    },
    {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
    },
    {
        path: '**',
        redirectTo: 'home',
        pathMatch: 'full'
    }
];
