import { Routes } from '@angular/router';
import { isAuthenticatedGuard } from '../auth/guards';

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
        canActivate: [isAuthenticatedGuard], // Ruta protegida - requiere autenticación
    },
    {
        path: 'my-products',
        loadComponent: () => import('./product/pages/product-vendor-list/product-vendor-list.component').then(m => m.ProductVendorListComponent),
        canActivate: [isAuthenticatedGuard], // Ruta protegida - requiere autenticación
    },
    {
        path: 'products/:id',
        loadComponent: () => import('./product/pages/product-vendor-edit/product-vendor-edit.component').then(m => m.ProductVendorEditComponent),
        canActivate: [isAuthenticatedGuard], // Ruta protegida - requiere autenticación para editar productos
    },
    {
        path: 'products/:id/detail',
        loadComponent: () => import('./product/pages/product-detail/product-detail.component').then(m => m.ProductDetailComponent),
        // Ruta pública - los detalles de productos pueden verse sin autenticación
    }
]
