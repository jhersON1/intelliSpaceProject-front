import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil, interval } from 'rxjs';

import { AnalyticsService } from '../../../../core/services/analytics.service';
import { LoggerService } from '../../../../core/services/logger.service';
import { ProductStats } from '../../../../core/types/analytics.interface';

import { HistoricalChartsComponent } from '../../components/historical-charts/historical-charts.component';
import { PredictiveAnalyticsComponent } from '../../components/predictive-analytics/predictive-analytics.component';

@Component({
  selector: 'app-advanced-analytics-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    HistoricalChartsComponent,
    PredictiveAnalyticsComponent
  ],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <div class="bg-white shadow-sm border-b border-gray-200">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="py-6">
            <div class="flex items-center justify-between">
              <div>
                <button 
                  (click)="goBack()"
                  class="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-2">
                  <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                  </svg>
                  Volver al Dashboard Principal
                </button>
                <h1 class="text-3xl font-bold text-gray-900">Analytics Avanzado</h1>
                <p class="mt-1 text-sm text-gray-600">
                  Análisis detallado de {{ productName() || 'producto' }} con Machine Learning y Teoría de Colas
                </p>
              </div>
              
              <div class="flex items-center space-x-4">
                <!-- Auto-refresh toggle -->
                <div class="flex items-center">
                  <input
                    id="auto-refresh"
                    type="checkbox"
                    [checked]="autoRefresh()"
                    (change)="toggleAutoRefresh()"
                    class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded">
                  <label for="auto-refresh" class="ml-2 text-sm text-gray-700">
                    Auto-actualizar (30s)
                  </label>
                </div>
                
                <!-- Refresh Button -->
                <button
                  (click)="refreshAll()"
                  [disabled]="isLoading()"
                  class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                  @if (isLoading()) {
                    <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Actualizando...
                  } @else {
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                    </svg>
                    Actualizar Todo
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      @if (isLoading() && !productStats()) {
        <!-- Initial Loading State -->
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div class="flex items-center justify-center h-64">
            <div class="text-center">
              <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p class="text-lg text-gray-600">Cargando analytics avanzado...</p>
              <p class="text-sm text-gray-500 mt-2">Esto puede tomar unos momentos</p>
            </div>
          </div>
        </div>
      } @else if (error()) {
        <!-- Error State -->
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div class="bg-red-50 border border-red-200 rounded-md p-6">
            <div class="flex">
              <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                </svg>
              </div>
              <div class="ml-3">
                <h3 class="text-sm font-medium text-red-800">Error al cargar analytics</h3>
                <div class="mt-2 text-sm text-red-700">{{ error() }}</div>
                <div class="mt-4">
                  <button 
                    (click)="refreshAll()"
                    class="bg-red-100 px-4 py-2 rounded text-sm text-red-800 hover:bg-red-200">
                    Reintentar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      } @else if (productStats()) {
        <!-- Main Dashboard Content -->
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          <!-- Real-time Metrics Overview -->
          <div class="mb-8">
            <h2 class="text-xl font-semibold text-gray-900 mb-4">📊 Métricas en Tiempo Real</h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">              <!-- Current Queue Metrics -->
              @if (currentQueueMetrics()) {
                <div class="col-span-1 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 class="text-lg font-semibold text-gray-900 mb-4">Métricas M/M/1</h3>
                  <div class="text-3xl font-bold text-blue-600 mb-2">
                    {{ (currentQueueMetrics()!.rho || 0).toFixed(2) }}
                  </div>
                  <div class="text-sm text-gray-600 mb-4">Factor de Utilización (ρ)</div>
                  <div class="text-sm text-gray-700">
                    {{ currentQueueMetrics()!.message || 'Calculando...' }}
                  </div>
                </div>
              }

              <!-- Key Performance Indicators -->
              <div class="col-span-1 md:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-4">KPIs Principales</h3>
                <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  
                  <div class="text-center">
                    <div class="text-2xl font-bold text-blue-600">{{ productStats()!.analytics.totalClicks || 0 }}</div>
                    <div class="text-sm text-gray-600">Total Clicks</div>
                  </div>

                  <div class="text-center">
                    <div class="text-2xl font-bold text-green-600">{{ productStats()!.analytics.totalViews || 0 }}</div>
                    <div class="text-sm text-gray-600">Total Views</div>
                  </div>

                  <div class="text-center">
                    <div class="text-2xl font-bold text-purple-600">{{ (productStats()!.analytics.arrivalRate || 0).toFixed(1) }}</div>
                    <div class="text-sm text-gray-600">λ (clicks/día)</div>
                  </div>

                  <div class="text-center">
                    <div class="text-2xl font-bold text-orange-600">{{ (productStats()!.analytics.serviceRate || 0).toFixed(2) }}</div>
                    <div class="text-sm text-gray-600">μ (reposiciones/día)</div>
                  </div>
                </div>

                <!-- Congestion Status -->
                <div class="mt-6 pt-6 border-t border-gray-200">
                  <div class="flex items-center justify-between">
                    <span class="text-sm font-medium text-gray-700">Estado del Sistema:</span>                    <span [class]="getCongestionClass(productStats()!.analytics.congestionStatus)" 
                          class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium">
                      {{ getCongestionText(productStats()!.analytics.congestionStatus) }}
                    </span>
                  </div>
                  
                  <!-- Utilization Progress Bar -->
                  <div class="mt-3">
                    <div class="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Factor de Utilización (ρ)</span>
                      <span>{{ (productStats()!.analytics.utilizationFactor || 0).toFixed(2) }}</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2.5">                      <div 
                        [class]="getUtilizationBarClass(productStats()!.analytics.utilizationFactor || 0)"
                        class="h-2.5 rounded-full transition-all duration-300"
                        [style.width.%]="Math.min((productStats()!.analytics.utilizationFactor || 0) * 100, 100)">
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Historical Analysis -->
          <div class="mb-8">
            <h2 class="text-xl font-semibold text-gray-900 mb-4">📈 Análisis Histórico</h2>
            <app-historical-charts 
              [productId]="productId()">
            </app-historical-charts>
          </div>

          <!-- Predictive Analytics -->
          <div class="mb-8">
            <h2 class="text-xl font-semibold text-gray-900 mb-4">🔮 Analytics Predictivo</h2>
            <app-predictive-analytics 
              [productId]="productId()">
            </app-predictive-analytics>
          </div>

          <!-- Mathematical Insights -->
          <div class="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg p-6 border border-indigo-200">
            <h3 class="text-lg font-semibold text-indigo-900 mb-4">🧮 Fundamentos Matemáticos</h3>
            
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 class="font-medium text-indigo-800 mb-3">Teoría de Colas M/M/1</h4>
                <div class="space-y-2 text-sm text-indigo-700">
                  <div class="flex justify-between">
                    <span>Tasa de llegadas (λ):</span>
                    <span class="font-mono">{{ (productStats()!.analytics.arrivalRate || 0).toFixed(4) }} clicks/día</span>
                  </div>
                  <div class="flex justify-between">
                    <span>Tasa de servicio (μ):</span>
                    <span class="font-mono">{{ (productStats()!.analytics.serviceRate || 0).toFixed(4) }} repos/día</span>
                  </div>
                  <div class="flex justify-between">
                    <span>Factor utilización (ρ):</span>
                    <span class="font-mono">{{ (productStats()!.analytics.utilizationFactor || 0).toFixed(4) }}</span>
                  </div>
                  @if (productStats()!.queueMetrics.message) {
                    <div class="mt-3 p-3 bg-indigo-100 rounded text-sm">
                      <strong>Interpretación:</strong> {{ productStats()!.queueMetrics.message }}
                    </div>
                  }
                </div>
              </div>
              
              <div>
                <h4 class="font-medium text-indigo-800 mb-3">Algoritmos de Machine Learning</h4>
                <div class="text-sm text-indigo-700 space-y-1">
                  <div>• <strong>Regresión Lineal:</strong> Análisis de tendencias</div>
                  <div>• <strong>Series Temporales:</strong> Patrones estacionales</div>
                  <div>• <strong>Suavizado Exponencial:</strong> Predicciones a corto plazo</div>
                  <div>• <strong>Intervalos de Confianza:</strong> Estimación de incertidumbre</div>
                </div>
                
                <div class="mt-4 p-3 bg-indigo-100 rounded text-sm">
                  <strong>Nota:</strong> Las predicciones combinan modelos estadísticos con teoría de colas 
                  para proporcionar insights accionables para la gestión de inventario.
                </div>
              </div>
            </div>
          </div>

          <!-- Last Updated Info -->
          <div class="mt-8 text-center text-sm text-gray-500">
            Última actualización: {{ lastUpdated() | date:'dd/MM/yyyy HH:mm:ss' }}
            @if (autoRefresh()) {
              • Auto-actualización activada
            }
          </div>
        </div>
      }
    </div>
  `
})
export class AdvancedAnalyticsDashboardComponent implements OnInit, OnDestroy {

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private analyticsService = inject(AnalyticsService);
  private logger = inject(LoggerService);

  private destroy$ = new Subject<void>();
  productId = signal<string>('');
  productName = signal<string>('');
  isLoading = signal(false);
  error = signal<string | null>(null);
  productStats = signal<ProductStats | null>(null);
  autoRefresh = signal(false);
  lastUpdated = signal(new Date());

  currentQueueMetrics = computed(() => {
    const stats = this.productStats();
    return stats?.queueMetrics || null;
  });

  ngOnInit() {
    this.route.paramMap.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.productId.set(id);
        this.loadAnalyticsData();
      } else {
        this.error.set('ID de producto no válido');
      }
    });

    interval(30000).pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      if (this.autoRefresh() && !this.isLoading()) {
        this.loadAnalyticsData();
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  goBack() {
    this.router.navigate(['/vendor/analytics']);
  }

  toggleAutoRefresh() {
    this.autoRefresh.set(!this.autoRefresh());
    this.logger.info('Auto-refresh toggled', { enabled: this.autoRefresh() });
  }

  refreshAll() {
    this.loadAnalyticsData();
  }

  private loadAnalyticsData() {
    const productId = this.productId();
    if (!productId) return;

    this.isLoading.set(true);
    this.error.set(null);

    this.analyticsService.getProductStats(productId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (stats) => {
        this.productStats.set(stats);

        if (stats.analytics && 'product' in stats.analytics) {
          const product = (stats.analytics as any).product;
          if (product?.title) {
            this.productName.set(product.title);
          }
        }

        this.lastUpdated.set(new Date());
        this.isLoading.set(false);
        this.logger.info('Advanced analytics loaded successfully', { productId });
      },
      error: (error) => {
        this.logger.error('Error loading advanced analytics', error);
        this.error.set('No se pudieron cargar los datos de analytics');
        this.isLoading.set(false);
      }
    });
  }

  getCongestionClass(status?: string): string {
    switch (status) {
      case 'CRITICO': return 'bg-red-100 text-red-800';
      case 'ADVERTENCIA': return 'bg-yellow-100 text-yellow-800';
      case 'ESTABLE': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getCongestionText(status?: string): string {
    switch (status) {
      case 'CRITICO': return '🚨 Crítico';
      case 'ADVERTENCIA': return '⚠️ Advertencia';
      case 'ESTABLE': return '✅ Estable';
      default: return '❓ Desconocido';
    }
  }

  getUtilizationBarClass(rho: number): string {
    if (rho >= 0.8) return 'bg-red-500';
    if (rho >= 0.5) return 'bg-yellow-500';
    return 'bg-green-500';
  }

  Math = Math;
}
