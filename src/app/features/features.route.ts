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
        canActivate: [isAuthenticatedGuard, isVendorGuard],
    },
    {
        path: 'my-products',
        loadComponent: () => import('./product/pages/product-vendor-list/product-vendor-list.component').then(m => m.ProductVendorListComponent),
        canActivate: [isAuthenticatedGuard, isVendorGuard],
    },
    {
        path: 'products/:id',
        loadComponent: () => import('./product/pages/product-vendor-edit/product-vendor-edit.component').then(m => m.ProductVendorEditComponent),
        canActivate: [isAuthenticatedGuard, isVendorGuard],
    },{
        path: 'products/:id/detail',
        loadComponent: () => import('./product/pages/product-detail/product-detail.component').then(m => m.ProductDetailComponent),
    },
    {
        path: 'vendor/analytics',
        loadComponent: () => import('./analytics/pages/vendor-dashboard/vendor-dashboard.component').then(m => m.VendorDashboardComponent),
        canActivate: [isAuthenticatedGuard, isVendorGuard],
    },
    {
        path: 'vendor/analytics/advanced/:id',
        loadComponent: () => import('./analytics/pages/advanced-analytics-dashboard/advanced-analytics-dashboard.component').then(m => m.AdvancedAnalyticsDashboardComponent),
        canActivate: [isAuthenticatedGuard, isVendorGuard],
    },    {
        path: 'vendor/analytics/export',
        loadComponent: () => import('./analytics/pages/export-dashboard/export-dashboard.component').then(m => m.ExportDashboardComponent),
        canActivate: [isAuthenticatedGuard, isVendorGuard],
    },    {
        path: 'vendor/messages',
        loadComponent: () => import('../shared/components/vendor-messages/vendor-messages.component').then(m => m.VendorMessagesComponent),
        canActivate: [isAuthenticatedGuard, isVendorGuard],
    },    {
        path: 'my-messages',
        loadComponent: () => import('../shared/components/consumer-messages/consumer-messages.component').then(m => m.ConsumerMessagesComponent),
        canActivate: [isAuthenticatedGuard, isConsumerGuard],
    }
]
