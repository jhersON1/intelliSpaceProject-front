import { Routes } from '@angular/router';
import { isAuthenticatedGuard, isVendorGuard, isConsumerGuard } from '../auth/guards';

export const featureRoutes = [
    {
        path: '',
        loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent),
    },
    {
        path: 'products',
        loadComponent: () => import('./product/pages/product-list/product-list.component').then(m => m.ProductListComponent),
    },    {
        path: 'products-create',
        loadComponent: () => import('./product/pages/product-create/product-create.component').then(m => m.ProductCreateComponent),
        canActivate: [isAuthenticatedGuard, isVendorGuard], // Ruta protegida - requiere autenticación Y rol de vendedor
    },
    {
        path: 'my-products',
        loadComponent: () => import('./product/pages/product-vendor-list/product-vendor-list.component').then(m => m.ProductVendorListComponent),
        canActivate: [isAuthenticatedGuard, isVendorGuard], // Ruta protegida - requiere autenticación Y rol de vendedor
    },
    {
        path: 'products/:id',
        loadComponent: () => import('./product/pages/product-vendor-edit/product-vendor-edit.component').then(m => m.ProductVendorEditComponent),
        canActivate: [isAuthenticatedGuard, isVendorGuard], // Ruta protegida - requiere autenticación Y rol de vendedor para editar productos
    },{
        path: 'products/:id/detail',
        loadComponent: () => import('./product/pages/product-detail/product-detail.component').then(m => m.ProductDetailComponent),
        // Ruta pública - los detalles de productos pueden verse sin autenticación
    },
    {
        path: 'vendor/analytics',
        loadComponent: () => import('./analytics/pages/vendor-dashboard/vendor-dashboard.component').then(m => m.VendorDashboardComponent),
        canActivate: [isAuthenticatedGuard, isVendorGuard], // Ruta protegida - requiere autenticación y rol de vendedor
    },
    {
        path: 'vendor/analytics/advanced/:id',
        loadComponent: () => import('./analytics/pages/advanced-analytics-dashboard/advanced-analytics-dashboard.component').then(m => m.AdvancedAnalyticsDashboardComponent),
        canActivate: [isAuthenticatedGuard, isVendorGuard], // Ruta protegida - analytics avanzado para vendedores
    },    {
        path: 'vendor/analytics/export',
        loadComponent: () => import('./analytics/pages/export-dashboard/export-dashboard.component').then(m => m.ExportDashboardComponent),
        canActivate: [isAuthenticatedGuard, isVendorGuard], // Ruta protegida - exportación de reportes para vendedores
    },    {
        path: 'vendor/messages',
        loadComponent: () => import('../shared/components/vendor-messages/vendor-messages.component').then(m => m.VendorMessagesComponent),
        canActivate: [isAuthenticatedGuard, isVendorGuard], // Ruta protegida - mensajes para vendedores
    },    {
        path: 'my-messages',
        loadComponent: () => import('../shared/components/consumer-messages/consumer-messages.component').then(m => m.ConsumerMessagesComponent),
        canActivate: [isAuthenticatedGuard, isConsumerGuard], // Ruta protegida - mensajes para consumers
    }
]
