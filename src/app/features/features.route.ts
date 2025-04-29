import { Routes } from '@angular/router';

export const featureRoutes = [
    {
        path: '',
        loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent),
    },
    {
        path: 'products',
        loadComponent: () => import('./product/pages/product-list/product-list.component').then(m => m.ProductListComponent),
    },
    {
        path: 'products-create',
        loadComponent: () => import('./product/pages/product-create/product-create.component').then(m => m.ProductCreateComponent),       
    },
    {
        path: 'my-products',
        loadComponent: () => import('./product/pages/product-vendor-list/product-vendor-list.component').then(m => m.ProductVendorListComponent),
    }
]
