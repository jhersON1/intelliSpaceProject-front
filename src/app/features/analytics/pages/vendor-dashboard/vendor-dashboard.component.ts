import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil, forkJoin, interval, switchMap } from 'rxjs';

import { AnalyticsService } from '../../../../core/services/analytics.service';
import { LoggerService } from '../../../../core/services/logger.service';
import { AuthService } from '../../../../auth/services/auth.service';
import { 
  VendorDashboard, 
  PriorityProduct, 
  ProductAlert,
  QueueMetrics 
} from '../../../../core/types/analytics.interface';

// Import components
import { QueueMetricsCardComponent } from '../../components/queue-metrics-card/queue-metrics-card.component';
import { PriorityProductsTableComponent } from '../../components/priority-products-table/priority-products-table.component';
import { VendorAlertsComponent } from '../../components/vendor-alerts/vendor-alerts.component';

@Component({
  selector: 'app-vendor-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    QueueMetricsCardComponent,
    PriorityProductsTableComponent,
    VendorAlertsComponent
  ],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <div class="bg-white shadow-sm border-b border-gray-200">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="py-6">
            <div class="flex items-center justify-between">
              <div>
                <h1 class="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
                <p class="mt-1 text-sm text-gray-600">
                  Panel de control para gestión inteligente de inventario
                </p>
              </div>
                <div class="flex items-center space-x-4">
                <!-- Force Recalculate Button - DEBUGGING -->
                <button
                  (click)="forceRecalculateMetrics()"
                  [disabled]="isLoading()"
                  class="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed">
                  @if (isLoading()) {
                    <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" class="opacity-25"></circle>
                      <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" class="opacity-75"></path>
                    </svg>
                  } @else {
                    <svg class="-ml-1 mr-2 h-4 w-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  }                  � Inicializar + Recalcular
                </button>

                <!-- Refresh Button -->
                <button
                  (click)="refreshDashboard()"
                  [disabled]="isLoading()"
                  class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                  @if (isLoading()) {
                    <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" class="opacity-25"></circle>
                      <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" class="opacity-75"></path>
                    </svg>
                  } @else {
                    <svg class="-ml-1 mr-2 h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  }
                  Actualizar
                </button>

                <!-- Auto-refresh toggle -->
                <label class="flex items-center space-x-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    [checked]="autoRefresh()"
                    (change)="toggleAutoRefresh($event)"
                    class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
                  <span>Auto-actualizar</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Dashboard Content -->
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        @if (hasError()) {
          <!-- Error State -->
          <div class="bg-red-50 border border-red-200 rounded-md p-4 mb-8">
            <div class="flex">
              <svg class="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
              <div class="ml-3">
                <h3 class="text-sm font-medium text-red-800">Error al cargar el dashboard</h3>
                <p class="mt-1 text-sm text-red-700">
                  No se pudieron obtener las métricas de analytics. Por favor, inténtalo de nuevo.
                </p>
              </div>
            </div>
          </div>
        }

        @if (isLoading() && !dashboard()) {
          <!-- Loading State -->
          <div class="animate-pulse">
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              @for (i of [1,2,3]; track i) {
                <div class="bg-gray-200 rounded-xl h-48"></div>
              }
            </div>
            <div class="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <div class="bg-gray-200 rounded-xl h-96"></div>
              <div class="bg-gray-200 rounded-xl h-96"></div>
            </div>
          </div>        } @else {
          <!-- Queue Metrics Card -->
          @if (dashboard()?.queueMetrics) {
            <div class="mb-8">              <app-queue-metrics-card
                [metrics]="queueMetrics()">
              </app-queue-metrics-card>
            </div>
          }

          <!-- Overview Cards -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <!-- Total Products -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <svg class="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4 8-4M4 7l8 4m0 0v10m0-10L4 7m8 4l8-4" />
                  </svg>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">Total Productos</dt>
                    <dd class="text-2xl font-bold text-gray-900">{{ dashboard()?.totalProducts || 0 }}</dd>
                  </dl>
                </div>
              </div>
            </div>

            <!-- Critical Products -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <svg class="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">Productos Críticos</dt>
                    <dd class="text-2xl font-bold text-red-600">{{ dashboard()?.criticalProducts || 0 }}</dd>
                  </dl>
                </div>
              </div>
            </div>

            <!-- Average Utilization -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <svg class="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">Utilización Promedio</dt>
                    <dd class="text-2xl font-bold text-gray-900">{{ formatUtilization(dashboard()?.averageUtilization) }}</dd>
                  </dl>
                </div>
              </div>
            </div>

            <!-- Total Interactions -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <svg class="h-8 w-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                  </svg>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">Total Interacciones</dt>
                    <dd class="text-2xl font-bold text-gray-900">{{ dashboard()?.totalInteractions || 0 }}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <!-- Main Dashboard Grid -->
          <div class="grid grid-cols-1 xl:grid-cols-3 gap-8">            <!-- Priority Products Table -->
            <div class="xl:col-span-2">
              <app-priority-products-table
                [products]="priorityProducts()"
                [title]="priorityTableTitle()"
                [hasMoreProducts]="hasMorePriorityProducts()"
                (productClick)="onProductClick($event)"
                (loadMore)="loadMorePriorityProducts()">
              </app-priority-products-table>
            </div>            <!-- Alerts Panel -->
            <div class="xl:col-span-1">
              <app-vendor-alerts
                [alerts]="vendorAlerts()">
              </app-vendor-alerts>
            </div>
          </div>

          <!-- Critical Products Section -->
          @if (criticalProducts().length > 0) {            <div class="mt-8">
              <app-priority-products-table
                [products]="criticalProducts()"
                [title]="criticalTableTitle()"
                emptyMessage="¡Excelente! No hay productos críticos"
                [showFooter]="false">
              </app-priority-products-table>
            </div>
          }
        }
      </div>
    </div>
  `
})
export class VendorDashboardComponent implements OnInit, OnDestroy {
  private readonly analyticsService = inject(AnalyticsService);
  private readonly logger = inject(LoggerService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  
  private readonly destroy$ = new Subject<void>();
  // State signals
  dashboard = signal<VendorDashboard | null>(null);
  priorityProducts = signal<PriorityProduct[]>([]);
  criticalProducts = signal<PriorityProduct[]>([]);
  vendorAlerts = signal<ProductAlert[]>([]);
  queueMetrics = signal<QueueMetrics | null>(null);
  isLoading = signal(false);
  hasError = signal(false);
  autoRefresh = signal(false);
  hasMorePriorityProducts = signal(false);

  // Computed values
  priorityTableTitle = signal('Productos Prioritarios');
  criticalTableTitle = signal('Productos Críticos - Atención Inmediata');

  // Expose signal function for template
  signal = signal;
  ngOnInit(): void {
    this.logger.info('Iniciando Vendor Dashboard', {}, 'VendorDashboardComponent');
      // Check if user is vendor
    if (!this.authService.isVendor()) {
      this.logger.warn('Usuario no es vendedor, redirigiendo', {}, 'VendorDashboardComponent');
      this.router.navigate(['/home']);
      return;
    }

    // 🔄 LIMPIAR CACHÉ AL CARGAR EL DASHBOARD
    this.logger.info('🧹 CLEARING CACHE ON DASHBOARD LOAD', {}, 'VendorDashboardComponent');
    this.analyticsService.clearDashboardCache();

    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  loadDashboardData(): void {
    this.isLoading.set(true);
    this.hasError.set(false);

    this.logger.info('📊 LOADING DASHBOARD DATA', {
      userAuthenticated: this.authService.isAuthenticated(),
      isVendor: this.authService.isVendor(),
      userId: this.authService.currentUser()?.id
    }, 'VendorDashboardComponent');

    // Load all dashboard data in parallel
    forkJoin({
      dashboard: this.analyticsService.getVendorDashboard(),
      priorityProducts: this.analyticsService.getPriorityProducts(10),
      criticalProducts: this.analyticsService.getCriticalProducts()
    }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: ({ dashboard, priorityProducts, criticalProducts }) => {
        this.logger.info('✅ DASHBOARD DATA LOADED SUCCESSFULLY', {
          totalProducts: dashboard.totalProducts,
          totalInteractions: dashboard.totalInteractions,
          priorityCount: priorityProducts.length,
          criticalCount: criticalProducts.length,
          dashboard
        }, 'VendorDashboardComponent');        this.dashboard.set(dashboard);
        this.priorityProducts.set(priorityProducts);
        this.criticalProducts.set(criticalProducts);
        this.vendorAlerts.set(dashboard.alerts || []);
        this.queueMetrics.set(dashboard.queueMetrics || null);
        this.hasMorePriorityProducts.set(priorityProducts.length >= 10);
        
        this.isLoading.set(false);
        this.hasError.set(false);
      },
      error: (error) => {
        this.logger.error('❌ ERROR LOADING DASHBOARD DATA', {
          error: error.message,
          status: error.status
        }, 'VendorDashboardComponent');
        
        this.isLoading.set(false);
        this.hasError.set(true);
      }
    });
  }
  refreshDashboard(): void {
    this.logger.info('🔄 REFRESHING DASHBOARD - CLEARING CACHE', {}, 'VendorDashboardComponent');
    
    // Limpiar caché antes de recargar
    this.analyticsService.clearDashboardCache();
    
    // Recargar datos
    this.loadDashboardData();
  }

  /**
   * ✅ MÉTODO TEMPORAL PARA DEBUGGING - Fuerza recálculo de todas las métricas
   */
  forceRecalculateMetrics(): void {
    this.isLoading.set(true);
      this.logger.info('🔧 INICIANDO PROCESO COMPLETO: INICIALIZACIÓN + RECÁLCULO', {}, 'VendorDashboardComponent.forceRecalculateMetrics');
    
    // Paso 1: Inicializar productos sin historial
    this.analyticsService.initializeProductsWithoutHistory().pipe(
      takeUntil(this.destroy$),
      // Paso 2: Después de la inicialización, forzar recálculo
      switchMap((initResult) => {
        this.logger.info('✅ INICIALIZACIÓN COMPLETADA', { initResult }, 'VendorDashboardComponent.forceRecalculateMetrics');
        return this.analyticsService.forceRecalculateAllMetrics();
      })
    ).subscribe({
      next: (result) => {
        this.logger.info('✅ PROCESO COMPLETO TERMINADO', { result }, 'VendorDashboardComponent.forceRecalculateMetrics');
        
        // Limpiar caché y recargar dashboard
        this.analyticsService.clearDashboardCache();
        
        // Esperar un momento antes de recargar para que el backend termine
        setTimeout(() => {
          this.loadDashboardData();
        }, 2000);
      },
      error: (error) => {
        this.logger.error('❌ ERROR EN EL PROCESO COMPLETO', { error }, 'VendorDashboardComponent.forceRecalculateMetrics');
        this.isLoading.set(false);
      }
    });}

  toggleAutoRefresh(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.autoRefresh.set(target.checked);
    
    if (target.checked) {
      this.logger.debug('Auto-refresh enabled', {}, 'VendorDashboardComponent');
      // Set up auto-refresh every 30 seconds
      interval(30000).pipe(
        takeUntil(this.destroy$)
      ).subscribe(() => {
        if (this.autoRefresh() && !this.isLoading()) {
          this.loadDashboardData();
        }
      });
    } else {
      this.logger.debug('Auto-refresh disabled', {}, 'VendorDashboardComponent');
    }
  }

  onProductClick(product: PriorityProduct): void {
    this.logger.debug('Product clicked', { productId: product.id }, 'VendorDashboardComponent');
    this.router.navigate(['/products', product.id, 'detail']);
  }

  loadMorePriorityProducts(): void {
    this.logger.debug('Loading more priority products', {}, 'VendorDashboardComponent');
    
    this.analyticsService.getPriorityProducts(20).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (products) => {
        this.priorityProducts.set(products);
        this.hasMorePriorityProducts.set(products.length >= 20);
      },
      error: (error) => {
        this.logger.error('Error loading more priority products', {
          error: error.message
        }, 'VendorDashboardComponent');
      }
    });
  }

  formatUtilization(utilization?: number): string {
    if (utilization === undefined || utilization === null) return '0.00';
    return utilization.toFixed(2);
  }
}
