import { Routes } from '@angular/router';

export const featureRoutes = [
    {
        path: '',
        loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent),
    },
    {
        path: 'products',
        loadComponent: () => import('./product/product-list/product-list.component').then(m => m.ProductListComponent),
    }
]
