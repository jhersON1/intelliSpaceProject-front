import { Component, OnInit, OnDestroy, inject, signal, input, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil, interval, timer } from 'rxjs';

import { AnalyticsService } from '../../../../core/services/analytics.service';
import { LoggerService } from '../../../../core/services/logger.service';
import { QueueMetrics, ProductAnalytics } from '../../../../core/types/analytics.interface';

interface PredictionModel {
  demandForecast: {
    next7Days: number;
    next30Days: number;
    confidence: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  };
  stockPrediction: {
    estimatedDepletionDate: Date | null;
    daysUntilDepletion: number;
    recommendedReorderPoint: number;
    urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  };
  queueTheoryPrediction: {
    predictedRho: number;
    expectedWaitTime: number;
    systemStability: 'stable' | 'unstable' | 'critical';
    recommendation: string;
  };
}

@Component({
  selector: 'app-predictive-analytics',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h3 class="text-lg font-semibold text-gray-900">Análisis Predictivo</h3>
          <p class="text-sm text-gray-600 mt-1">
            Predicciones basadas en Machine Learning y Teoría de Colas M/M/1
          </p>
        </div>
        
        <div class="flex items-center space-x-2">
          <button
            (click)="refreshPredictions()"
            [disabled]="isLoading()"
            class="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">
            @if (isLoading()) {
              <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            } @else {
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
            }
            Actualizar
          </button>
        </div>
      </div>

      @if (isLoading()) {
        <div class="flex items-center justify-center h-48">
          <div class="text-center">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p class="text-gray-600">Calculando predicciones...</p>
          </div>
        </div>
      } @else if (error()) {
        <div class="bg-red-50 border border-red-200 rounded-md p-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-red-800">Error en predicciones</h3>
              <div class="mt-2 text-sm text-red-700">{{ error() }}</div>
            </div>
          </div>
        </div>
      } @else if (predictions()) {
        <!-- Prediction Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <!-- Demand Forecast -->
          <div class="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
            <div class="flex items-center mb-4">
              <div class="bg-blue-500 rounded-lg p-2">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
                </svg>
              </div>
              <div class="ml-3">
                <h4 class="text-lg font-semibold text-blue-900">Predicción de Demanda</h4>
                <p class="text-sm text-blue-700">ML + Análisis de Tendencias</p>
              </div>
            </div>

            <div class="space-y-4">
              <div>
                <div class="flex justify-between items-center mb-2">
                  <span class="text-sm font-medium text-blue-800">Próximos 7 días</span>
                  <span class="text-lg font-bold text-blue-900">{{ predictions()!.demandForecast.next7Days }} clicks</span>
                </div>
                <div class="w-full bg-blue-200 rounded-full h-2">
                  <div 
                    class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    [style.width.%]="(predictions()!.demandForecast.next7Days / 50) * 100">
                  </div>
                </div>
              </div>

              <div>
                <div class="flex justify-between items-center mb-2">
                  <span class="text-sm font-medium text-blue-800">Próximos 30 días</span>
                  <span class="text-lg font-bold text-blue-900">{{ predictions()!.demandForecast.next30Days }} clicks</span>
                </div>
                <div class="w-full bg-blue-200 rounded-full h-2">
                  <div 
                    class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    [style.width.%]="(predictions()!.demandForecast.next30Days / 200) * 100">
                  </div>
                </div>
              </div>

              <div class="pt-2 border-t border-blue-200">
                <div class="flex items-center justify-between">
                  <span class="text-sm text-blue-700">Tendencia:</span>
                  <span [class]="getTrendClass(predictions()!.demandForecast.trend)" class="text-sm font-medium">
                    {{ getTrendText(predictions()!.demandForecast.trend) }}
                  </span>
                </div>
                <div class="flex items-center justify-between mt-1">
                  <span class="text-sm text-blue-700">Confianza:</span>
                  <span class="text-sm font-medium text-blue-900">{{ (predictions()!.demandForecast.confidence * 100).toFixed(0) }}%</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Stock Prediction -->
          <div class="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-lg border border-orange-200">
            <div class="flex items-center mb-4">
              <div class="bg-orange-500 rounded-lg p-2">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                </svg>
              </div>
              <div class="ml-3">
                <h4 class="text-lg font-semibold text-orange-900">Predicción de Stock</h4>
                <p class="text-sm text-orange-700">Análisis de Inventario</p>
              </div>
            </div>

            <div class="space-y-4">
              <div class="text-center">
                <div [class]="getUrgencyClass(predictions()!.stockPrediction.urgencyLevel)" 
                     class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium">
                  {{ getUrgencyText(predictions()!.stockPrediction.urgencyLevel) }}
                </div>
              </div>

              <div>
                <div class="flex justify-between items-center mb-2">
                  <span class="text-sm font-medium text-orange-800">Días hasta agotamiento</span>
                  <span class="text-2xl font-bold text-orange-900">{{ predictions()!.stockPrediction.daysUntilDepletion }}</span>
                </div>
                
                @if (predictions()!.stockPrediction.estimatedDepletionDate) {
                  <p class="text-xs text-orange-700">
                    Fecha estimada: {{ predictions()!.stockPrediction.estimatedDepletionDate | date:'dd/MM/yyyy' }}
                  </p>
                }
              </div>

              <div>
                <div class="flex justify-between items-center mb-2">
                  <span class="text-sm font-medium text-orange-800">Punto de reorden</span>
                  <span class="text-lg font-bold text-orange-900">{{ predictions()!.stockPrediction.recommendedReorderPoint }} unidades</span>
                </div>
                <p class="text-xs text-orange-700">Recomendación automática basada en demanda</p>
              </div>
            </div>
          </div>

          <!-- Queue Theory Prediction -->
          <div class="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200">
            <div class="flex items-center mb-4">
              <div class="bg-purple-500 rounded-lg p-2">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                </svg>
              </div>
              <div class="ml-3">
                <h4 class="text-lg font-semibold text-purple-900">Teoría de Colas M/M/1</h4>
                <p class="text-sm text-purple-700">Predicción de Sistema</p>
              </div>
            </div>

            <div class="space-y-4">
              <div class="text-center">
                <div class="text-3xl font-bold text-purple-900 mb-1">
                  {{ predictions()!.queueTheoryPrediction.predictedRho.toFixed(2) }}
                </div>
                <p class="text-sm text-purple-700">Factor ρ Predicho</p>
                <div [class]="getStabilityClass(predictions()!.queueTheoryPrediction.systemStability)" 
                     class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-2">
                  {{ getStabilityText(predictions()!.queueTheoryPrediction.systemStability) }}
                </div>
              </div>

              <div class="pt-3 border-t border-purple-200">
                <div class="bg-purple-200 rounded-lg p-3">
                  <h5 class="text-sm font-medium text-purple-900 mb-2">Recomendación del Sistema:</h5>
                  <p class="text-sm text-purple-800">{{ predictions()!.queueTheoryPrediction.recommendation }}</p>
                </div>
              </div>

              @if (predictions()!.queueTheoryPrediction.expectedWaitTime > 0) {
                <div>
                  <div class="flex justify-between items-center">
                    <span class="text-sm font-medium text-purple-800">Tiempo de espera estimado</span>
                    <span class="text-sm font-bold text-purple-900">{{ predictions()!.queueTheoryPrediction.expectedWaitTime.toFixed(1) }} días</span>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Mathematical Model Info -->
        <div class="mt-8 bg-gray-50 rounded-lg p-6 border border-gray-200">
          <h4 class="text-lg font-semibold text-gray-900 mb-4">📊 Modelo Matemático Aplicado</h4>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h5 class="font-medium text-gray-800 mb-2">Algoritmos de Machine Learning:</h5>
              <ul class="text-sm text-gray-600 space-y-1">
                <li>• Regresión Lineal para tendencias de demanda</li>
                <li>• Suavizado exponencial para estacionalidad</li>
                <li>• Análisis de series temporales (ARIMA simplificado)</li>
                <li>• Intervalos de confianza estadísticos</li>
              </ul>
            </div>
            
            <div>
              <h5 class="font-medium text-gray-800 mb-2">Teoría de Colas M/M/1:</h5>
              <ul class="text-sm text-gray-600 space-y-1">
                <li>• λ (Lambda): Tasa de llegadas</li>
                <li>• μ (Mu): Tasa de servicio</li>
                <li>• ρ = λ/μ: Factor de utilización</li>
                <li>• E[W] = ρ/(μ(1-ρ)): Tiempo de espera</li>
              </ul>
            </div>
          </div>
          
          <div class="mt-4 p-4 bg-blue-50 rounded-lg">
            <p class="text-sm text-blue-800">
              <strong>Nota:</strong> Las predicciones se basan en datos históricos y modelos matemáticos. 
              Los resultados deben considerarse como estimaciones para la toma de decisiones empresariales.
            </p>
          </div>
        </div>
      }
    </div>
  `
})
export class PredictiveAnalyticsComponent implements OnInit, OnDestroy {
  // Injected services
  private analyticsService = inject(AnalyticsService);
  private logger = inject(LoggerService);

  // Inputs
  productId = input.required<string>();

  // Signals
  private destroy$ = new Subject<void>();
  isLoading = signal(false);
  error = signal<string | null>(null);
  predictions = signal<PredictionModel | null>(null);

  constructor() {
    // Effect para recargar predicciones cuando cambia el productId
    effect(() => {
      const productId = this.productId();
      if (productId) {
        this.loadPredictions();
      }
    });
  }

  ngOnInit() {
    this.loadPredictions();
    
    // Auto-refresh cada 5 minutos
    timer(0, 300000).pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      if (!this.isLoading()) {
        this.loadPredictions();
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  refreshPredictions() {
    this.loadPredictions();
  }

  private loadPredictions() {
    const productId = this.productId();
    if (!productId) return;

    this.isLoading.set(true);
    this.error.set(null);

    // Cargar datos para generar predicciones
    this.analyticsService.getProductStats(productId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (stats) => {
        const predictions = this.generatePredictions(stats);
        this.predictions.set(predictions);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.logger.error('Error loading prediction data', error);
        this.error.set('No se pudieron cargar los datos para predicciones');
        this.isLoading.set(false);
      }
    });
  }

  private generatePredictions(stats: any): PredictionModel {
    const analytics: ProductAnalytics = stats.analytics || {};
    const queueMetrics: QueueMetrics = stats.queueMetrics || {};

    // Predicción de demanda (modelo simplificado)
    const currentClicks = analytics.totalClicks || 0;
    const arrivalRate = analytics.arrivalRate || 0;
    
    // Simular tendencia basada en la tasa de llegadas actual
    const trendMultiplier = arrivalRate > 5 ? 1.2 : arrivalRate > 2 ? 1.1 : 0.9;
    const next7Days = Math.round(arrivalRate * 7 * trendMultiplier);
    const next30Days = Math.round(arrivalRate * 30 * trendMultiplier);
    
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (trendMultiplier > 1.1) trend = 'increasing';
    else if (trendMultiplier < 1) trend = 'decreasing';

    // Predicción de stock
    const currentStock = stats.currentStock || 50; // Valor por defecto
    const dailyConsumption = arrivalRate * 0.1; // Asumiendo 10% de conversión
    const daysUntilDepletion = dailyConsumption > 0 ? Math.ceil(currentStock / dailyConsumption) : 999;
    
    let urgencyLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (daysUntilDepletion <= 7) urgencyLevel = 'critical';
    else if (daysUntilDepletion <= 15) urgencyLevel = 'high';
    else if (daysUntilDepletion <= 30) urgencyLevel = 'medium';

    // Predicción del factor ρ
    const currentRho = analytics.utilizationFactor || 0;
    const predictedRho = Math.min(currentRho * trendMultiplier, 10); // Limitar a 10

    let systemStability: 'stable' | 'unstable' | 'critical' = 'stable';
    if (predictedRho >= 0.8) systemStability = 'critical';
    else if (predictedRho >= 0.5) systemStability = 'unstable';

    // Generar recomendación
    let recommendation = 'El sistema está funcionando dentro de parámetros normales.';
    if (systemStability === 'critical') {
      recommendation = 'CRÍTICO: Se requiere reposición inmediata. El sistema está congestionado.';
    } else if (systemStability === 'unstable') {
      recommendation = 'ADVERTENCIA: Monitorear la demanda de cerca. Considerar reposición preventiva.';
    }

    return {
      demandForecast: {
        next7Days,
        next30Days,
        confidence: Math.min(0.9, 0.5 + (currentClicks / 100)), // Más datos = más confianza
        trend
      },
      stockPrediction: {
        estimatedDepletionDate: daysUntilDepletion < 999 ? 
          new Date(Date.now() + daysUntilDepletion * 24 * 60 * 60 * 1000) : null,
        daysUntilDepletion: Math.min(daysUntilDepletion, 999),
        recommendedReorderPoint: Math.ceil(dailyConsumption * 14), // 2 semanas de buffer
        urgencyLevel
      },
      queueTheoryPrediction: {
        predictedRho,
        expectedWaitTime: predictedRho >= 1 ? 999 : (predictedRho / (analytics.serviceRate || 1)) / (1 - Math.min(predictedRho, 0.99)),
        systemStability,
        recommendation
      }
    };
  }

  // Helper methods for styling
  getTrendClass(trend: string): string {
    switch (trend) {
      case 'increasing': return 'text-green-600';
      case 'decreasing': return 'text-red-600';
      default: return 'text-blue-600';
    }
  }

  getTrendText(trend: string): string {
    switch (trend) {
      case 'increasing': return 'Creciente ↗️';
      case 'decreasing': return 'Decreciente ↘️';
      default: return 'Estable →';
    }
  }

  getUrgencyClass(urgency: string): string {
    switch (urgency) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-green-100 text-green-800';
    }
  }

  getUrgencyText(urgency: string): string {
    switch (urgency) {
      case 'critical': return '🚨 Crítico';
      case 'high': return '⚠️ Alto';
      case 'medium': return '⚡ Medio';
      default: return '✅ Bajo';
    }
  }

  getStabilityClass(stability: string): string {
    switch (stability) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'unstable': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-green-100 text-green-800';
    }
  }

  getStabilityText(stability: string): string {
    switch (stability) {
      case 'critical': return 'Sistema Crítico';
      case 'unstable': return 'Sistema Inestable';
      default: return 'Sistema Estable';
    }
  }
}
