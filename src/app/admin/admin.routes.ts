import { Routes } from '@angular/router';
import { isAdminGuard } from '../auth/guards';

export const adminRoutes: Routes = [
  {
    path: 'dashboard',
    loadComponent: () => import('./admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent),
    canActivate: [isAdminGuard],
  },
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  }
];
