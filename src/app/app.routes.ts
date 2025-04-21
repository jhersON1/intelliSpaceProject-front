import { Routes } from '@angular/router';
import { isAuthenticatedGuard } from './auth/guards';

export const routes: Routes = [
    {
        path: 'home',
        loadChildren: () => import('./features/features.route').then(m => m.featureRoutes),
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
