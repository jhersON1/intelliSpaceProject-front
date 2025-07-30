import { Component, input, output, inject, signal, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PriorityProduct } from '../../../../core/types/analytics.interface';
import { AnalyticsService } from '../../../../core/services/analytics.service';

interface ProductAnalyticsData {
  productId: string;
  totalClicks: number;
  totalViews: number;
  totalSearches: number;
  arrivalRate: number;
  serviceRate: number;
  utilizationFactor: number;
  congestionStatus: 'ESTABLE' | 'ADVERTENCIA' | 'CRITICO';
  lastCalculation: Date;
  queueMetrics: QueueMetricsWithDetails;
}

interface QueueMetricsWithDetails {
  lambda: number;
  mu: number;
  rho: number;
  status: string;
  message: string;
  muCalculationDetails?: MuCalculationDetails;
}

interface MuCalculationDetails {
  calculationMethod: string;
  repositionsCount: number;
  depletionsCount: number;
  repositionDates: string[];
  daysBetweenRepositions: number[];
  averageDaysBetween: number;
  rawMu: number;
  depletionPenalty: number;
  finalMu: number;
  explanation: string;
}

@Component({
  selector: 'app-product-analytics-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Modal Overlay -->
    @if (isOpen()) {
      <div class="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-[9999] flex items-center justify-center p-4"
           (click)="closeModal()">
        
        <!-- Modal Container -->
        <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
             (click)="$event.stopPropagation()">
          
          <!-- Modal Header -->
          <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-xl font-bold text-gray-900">
                  📊 Detalles de Analytics - {{ product()?.name }}
                </h3>
                <p class="text-sm text-gray-500 mt-1">
                  Métricas del modelo M/M/1 y datos de teoría de colas
                </p>
              </div>
              <button (click)="closeModal()" 
                      class="text-gray-400 hover:text-gray-600 text-2xl font-bold p-2 hover:bg-gray-100 rounded-full transition-colors">
                ×
              </button>
            </div>
          </div>

          <!-- Content -->
          <div class="px-6 py-4">
            <!-- Loading State -->
            @if (loading()) {
              <div class="flex justify-center items-center py-12">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                <span class="ml-3 text-gray-600 text-lg">Cargando métricas...</span>
              </div>
            }

            <!-- Content -->
            @if (!loading() && stats()) {
              <div class="space-y-6">
                
                <!-- Estado General -->
                <div class="bg-gray-50 rounded-lg p-6">
                  <h4 class="font-semibold text-gray-800 mb-4 flex items-center">
                    📊 <span class="ml-2">Estado General</span>
                  </h4>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <span class="text-sm text-gray-600 block mb-2">Estado de Congestión:</span>
                      <div>
                        <span class="inline-flex px-4 py-2 text-sm font-semibold rounded-full"
                              [class]="getStatusClasses(stats()!.congestionStatus || 'ESTABLE')">
                          {{ getStatusText(stats()!.congestionStatus || 'ESTABLE') }}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span class="text-sm text-gray-600 block mb-2">Factor de Utilización (ρ):</span>
                      <div class="text-2xl font-mono font-bold"
                           [class]="getFactorTextColor(stats()!.utilizationFactor || 0)">
                        {{ (stats()!.utilizationFactor || 0).toFixed(3) }}
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Métricas M/M/1 -->
                <div class="bg-blue-50 rounded-lg p-6">
                  <h4 class="font-semibold text-gray-800 mb-4 flex items-center">
                    🧮 <span class="ml-2">Métricas del Modelo M/M/1</span>
                  </h4>
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    
                    <!-- Lambda (λ) -->
                    <div class="bg-white rounded-lg p-4 border shadow-sm">
                      <div class="text-sm text-gray-600 mb-2">Tasa de Llegadas (λ)</div>
                      <div class="text-2xl font-mono font-bold text-blue-600">
                        {{ (stats()!.arrivalRate || 0).toFixed(4) }}
                      </div>
                      <div class="text-xs text-gray-500 mt-1">clicks/día</div>
                      <div class="text-xs text-gray-400 mt-1">
                        Demanda del producto
                      </div>
                    </div>

                    <!-- Mu (μ) -->
                    <div class="bg-white rounded-lg p-4 border shadow-sm">
                      <div class="text-sm text-gray-600 mb-2">Tasa de Servicio (μ)</div>
                      <div class="text-2xl font-mono font-bold text-green-600">
                        {{ (stats()!.serviceRate || 0).toFixed(4) }}
                      </div>
                      <div class="text-xs text-gray-500 mt-1">repos./día</div>
                      <div class="text-xs text-gray-400 mt-1">
                        Capacidad de reposición
                      </div>
                    </div>

                    <!-- Rho (ρ) -->
                    <div class="bg-white rounded-lg p-4 border shadow-sm">
                      <div class="text-sm text-gray-600 mb-2">Factor de Utilización (ρ)</div>
                      <div class="text-2xl font-mono font-bold"
                           [class]="getFactorTextColor(stats()!.utilizationFactor || 0)">
                        {{ (stats()!.utilizationFactor || 0).toFixed(3) }}
                      </div>
                      <div class="text-xs text-gray-500 mt-1">λ / μ</div>
                      <div class="text-xs text-gray-400 mt-1">
                        Nivel de congestión
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Datos de Interacción -->
                <div class="bg-green-50 rounded-lg p-6">
                  <h4 class="font-semibold text-gray-800 mb-4 flex items-center">
                    👆 <span class="ml-2">Interacciones de Usuario</span>
                  </h4>
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    
                    <div class="bg-white rounded-lg p-4 border shadow-sm">
                      <div class="text-sm text-gray-600 mb-2">Total Clicks</div>
                      <div class="text-3xl font-bold text-indigo-600">
                        {{ stats()!.totalClicks || 0 }}
                      </div>
                      <div class="text-xs text-gray-500 mt-1">Clicks directos</div>
                    </div>

                    <div class="bg-white rounded-lg p-4 border shadow-sm">
                      <div class="text-sm text-gray-600 mb-2">Total Vistas</div>
                      <div class="text-3xl font-bold text-purple-600">
                        {{ stats()!.totalViews || 0 }}
                      </div>
                      <div class="text-xs text-gray-500 mt-1">Visualizaciones</div>
                    </div>

                    <div class="bg-white rounded-lg p-4 border shadow-sm">
                      <div class="text-sm text-gray-600 mb-2">Total Búsquedas</div>
                      <div class="text-3xl font-bold text-orange-600">
                        {{ stats()!.totalSearches || 0 }}
                      </div>
                      <div class="text-xs text-gray-500 mt-1">En búsquedas</div>
                    </div>
                  </div>                </div>

                <!-- Cálculo Detallado de μ (Mu) -->
                @if (stats()?.queueMetrics?.muCalculationDetails) {
                  <div class="bg-purple-50 rounded-lg p-6 border-l-4 border-purple-500">
                    <h4 class="font-semibold text-gray-800 mb-4 flex items-center">
                      🧮 <span class="ml-2">Cálculo Detallado de μ (Tasa de Servicio)</span>
                    </h4>
                    
                    <!-- Método de Cálculo -->
                    <div class="bg-white rounded-lg p-4 border shadow-sm mb-4">
                      <div class="text-sm font-medium text-purple-700 mb-2">Método Utilizado:</div>
                      <div class="text-sm text-gray-700">{{ getMuDetails().calculationMethod }}</div>
                    </div>

                    <!-- Datos Base -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div class="bg-white rounded-lg p-3 border">
                        <div class="text-xs text-gray-600 mb-1">Reposiciones Encontradas</div>
                        <div class="text-xl font-bold text-blue-600">{{ getMuDetails().repositionsCount }}</div>
                      </div>
                      <div class="bg-white rounded-lg p-3 border">
                        <div class="text-xs text-gray-600 mb-1">Agotamientos Detectados</div>
                        <div class="text-xl font-bold text-red-600">{{ getMuDetails().depletionsCount }}</div>
                      </div>
                      <div class="bg-white rounded-lg p-3 border">
                        <div class="text-xs text-gray-600 mb-1">μ Final</div>
                        <div class="text-xl font-bold text-green-600">{{ getMuDetails().finalMu }}</div>
                      </div>
                    </div>

                    <!-- Fechas de Reposiciones (si existen) -->
                    @if (getMuDetails().repositionDates.length > 0) {
                      <div class="bg-white rounded-lg p-4 border shadow-sm mb-4">
                        <div class="text-sm font-medium text-gray-700 mb-2">📅 Fechas de Reposiciones:</div>
                        <div class="flex flex-wrap gap-2">
                          @for (date of getMuDetails().repositionDates; track $index) {
                            <span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                              {{ date }}
                            </span>
                          }
                        </div>
                      </div>
                    }

                    <!-- Días entre Reposiciones (si existen) -->
                    @if (getMuDetails().daysBetweenRepositions.length > 0) {
                      <div class="bg-white rounded-lg p-4 border shadow-sm mb-4">
                        <div class="text-sm font-medium text-gray-700 mb-2">⏱️ Días entre Reposiciones:</div>
                        <div class="flex flex-wrap gap-2 mb-2">
                          @for (days of getMuDetails().daysBetweenRepositions; track $index) {
                            <span class="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                              {{ days }} días
                            </span>
                          }
                        </div>
                        <div class="text-sm text-gray-600">
                          <strong>Promedio:</strong> {{ getMuDetails().averageDaysBetween }} días
                        </div>
                      </div>
                    }

                    <!-- Cálculo Paso a Paso -->
                    <div class="bg-gray-50 rounded-lg p-4 mb-4">
                      <div class="text-sm font-medium text-gray-700 mb-2">🔢 Cálculo Paso a Paso:</div>
                      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div class="text-center">
                          <div class="text-xs text-gray-500 mb-1">μ Original</div>
                          <div class="text-lg font-mono font-bold text-blue-600">{{ getMuDetails().rawMu }}</div>
                        </div>
                        <div class="text-center">
                          <div class="text-xs text-gray-500 mb-1">Factor Penalización</div>
                          <div class="text-lg font-mono font-bold" 
                               [class]="getMuDetails().depletionPenalty < 1 ? 'text-red-600' : 'text-green-600'">
                            {{ getMuDetails().depletionPenalty }}
                          </div>
                        </div>
                        <div class="text-center">
                          <div class="text-xs text-gray-500 mb-1">μ Final</div>
                          <div class="text-lg font-mono font-bold text-purple-600">{{ getMuDetails().finalMu }}</div>
                        </div>
                      </div>
                    </div>                    <!-- Explicación Detallada -->
                    <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border shadow-sm">
                      <div class="flex items-center gap-2 mb-4">
                        <span class="text-2xl">📝</span>
                        <div class="text-lg font-semibold text-gray-800">Explicación Completa del Cálculo</div>
                      </div>
                      <div class="bg-white rounded-lg p-4 shadow-sm">
                        <div class="text-sm text-gray-700 whitespace-pre-line leading-relaxed font-mono">{{ getMuDetails().explanation }}</div>
                      </div>
                      
                      <!-- Resumen visual adicional -->
                      <div class="mt-4 bg-white rounded-lg p-4 shadow-sm">
                        <div class="text-sm font-medium text-gray-700 mb-2">� Resumen Ejecutivo:</div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div class="bg-blue-50 p-3 rounded-lg">
                            <div class="font-medium text-blue-800">Método de Cálculo</div>
                            <div class="text-blue-600">{{ getMuDetails().calculationMethod }}</div>
                          </div>
                          <div class="bg-green-50 p-3 rounded-lg">
                            <div class="font-medium text-green-800">Capacidad de Servicio</div>
                            <div class="text-green-600">{{ getMuDetails().finalMu }} reposiciones/día</div>
                          </div>
                          <div class="bg-purple-50 p-3 rounded-lg">
                            <div class="font-medium text-purple-800">Frecuencia de Reposición</div>
                            <div class="text-purple-600">Cada {{ (1/getMuDetails().finalMu).toFixed(1) }} días</div>
                          </div>
                          <div class="bg-gray-50 p-3 rounded-lg">
                            <div class="font-medium text-gray-800">Confiabilidad</div>
                            <div class="text-gray-600">
                              {{ getMuDetails().repositionsCount >= 2 ? 'Alta' : 
                                 getMuDetails().repositionsCount === 1 ? 'Media' : 'Baja' }}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                }

                <!-- Interpretación -->
                <div class="bg-yellow-50 rounded-lg p-6">
                  <h4 class="font-semibold text-gray-800 mb-4 flex items-center">
                    💡 <span class="ml-2">Interpretación</span>
                  </h4>
                  <div class="text-sm text-gray-700 leading-relaxed">
                    {{ getInterpretation() }}
                  </div>
                </div>

                <!-- Recomendaciones -->
                @if (getRecommendations().length > 0) {
                  <div class="bg-orange-50 rounded-lg p-6">
                    <h4 class="font-semibold text-gray-800 mb-4 flex items-center">
                      🚀 <span class="ml-2">Recomendaciones</span>
                    </h4>
                    <ul class="text-sm text-gray-700 space-y-2">
                      @for (recommendation of getRecommendations(); track $index) {
                        <li class="flex items-start">
                          <span class="text-orange-600 mr-2 mt-1">•</span>
                          <span>{{ recommendation }}</span>
                        </li>
                      }
                    </ul>
                  </div>
                }

              </div>
            }

            <!-- Error State -->
            @if (!loading() && !stats()) {
              <div class="text-center py-12">
                <div class="text-6xl text-red-500 mb-4">⚠️</div>
                <h3 class="text-lg font-medium text-gray-900 mb-2">Error al cargar datos</h3>
                <p class="text-gray-600">No se pudieron obtener las métricas del producto</p>
              </div>
            }
          </div>

          <!-- Modal Footer -->
          <div class="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-xl">
            <div class="flex justify-end">
              <button (click)="closeModal()"
                      class="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium">
                Cerrar
              </button>
            </div>
          </div>

        </div>
      </div>
    }
  `
})
export class ProductAnalyticsModalComponent implements OnInit {
  isOpen = input<boolean>(false);
  product = input<PriorityProduct | null>(null);
  
  close = output<void>();
  
  private analyticsService = inject(AnalyticsService);
  
  loading = signal<boolean>(false);
  stats = signal<ProductAnalyticsData | null>(null);

  constructor() {
    effect(() => {
      this.loadProductStats();
    });
  }

  ngOnInit() {
    this.loadProductStats();
  }

  private loadProductStats() {
    const currentProduct = this.product();
    const isModalOpen = this.isOpen();
    
    if (isModalOpen && currentProduct?.id) {
      this.loading.set(true);
      this.stats.set(null);
        this.analyticsService.getProductStats(currentProduct.id).subscribe({
        next: (productStats) => {
          this.stats.set(productStats as unknown as ProductAnalyticsData);
          this.loading.set(false);
        },
        error: (error) => {
          this.loading.set(false);
        }
      });
    }
  }

  closeModal() {
    this.close.emit();
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'CRITICO': return 'Crítico';
      case 'ADVERTENCIA': return 'Advertencia';
      case 'ESTABLE': return 'Estable';
      default: return 'Desconocido';
    }
  }

  getStatusClasses(status: string): string {
    switch (status) {
      case 'CRITICO': return 'bg-red-100 text-red-800';
      case 'ADVERTENCIA': return 'bg-yellow-100 text-yellow-800';
      case 'ESTABLE': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getFactorTextColor(factor: number): string {
    if (factor >= 0.8) return 'text-red-600';
    if (factor >= 0.5) return 'text-yellow-600';
    return 'text-green-600';
  }

  getInterpretation(): string {
    const currentStats = this.stats();
    if (!currentStats) return 'No hay datos disponibles para interpretar.';

    const rho = currentStats.utilizationFactor || 0;
    const lambda = currentStats.arrivalRate || 0;
    const mu = currentStats.serviceRate || 0;

    if (rho >= 0.8) {
      return `Este producto está en estado CRÍTICO (ρ = ${rho.toFixed(3)}). La demanda (${lambda.toFixed(2)} clicks/día) supera significativamente la capacidad de reposición (${mu.toFixed(4)} repos./día). Necesita atención inmediata.`;
    } else if (rho >= 0.5) {
      return `Este producto está en ADVERTENCIA (ρ = ${rho.toFixed(3)}). La demanda (${lambda.toFixed(2)} clicks/día) es moderada comparada con la capacidad de reposición (${mu.toFixed(4)} repos./día). Monitorear tendencias.`;
    } else {
      return `Este producto está ESTABLE (ρ = ${rho.toFixed(3)}). La demanda (${lambda.toFixed(2)} clicks/día) está bien controlada por la capacidad de reposición (${mu.toFixed(4)} repos./día).`;
    }
  }

  getRecommendations(): string[] {
    const currentStats = this.stats();
    if (!currentStats) return [];

    const rho = currentStats.utilizationFactor || 0;
    const lambda = currentStats.arrivalRate || 0;
    const mu = currentStats.serviceRate || 0;
    const recommendations: string[] = [];

    if (rho >= 0.8) {
      recommendations.push('Reponer stock más frecuentemente para aumentar μ (tasa de servicio)');
      recommendations.push('Considerar aumentar el stock de seguridad');
      if (lambda > 10) {
        recommendations.push('La demanda es muy alta, considerar ajustar el precio');
      }
      if (mu < 0.5) {
        recommendations.push('Mejorar la logística de reposición (μ muy bajo)');
      }
    } else if (rho >= 0.5) {
      recommendations.push('Monitorear las tendencias de demanda');
      recommendations.push('Preparar plan de contingencia para picos de demanda');
    } else {
      if (lambda < 1) {
        recommendations.push('Considerar promocionar más este producto (demanda baja)');
      }
      recommendations.push('Producto estable, mantener estrategia actual');
    }

    return recommendations;
  }

  getMuDetails(): MuCalculationDetails {
    const currentStats = this.stats();
    if (!currentStats?.queueMetrics?.muCalculationDetails) {
      return {
        calculationMethod: 'No hay datos disponibles',
        repositionsCount: 0,
        depletionsCount: 0,
        repositionDates: [],
        daysBetweenRepositions: [],
        averageDaysBetween: 0,
        rawMu: 0,
        depletionPenalty: 1,
        finalMu: 0,
        explanation: 'No se encontraron datos suficientes para calcular μ.'
      };
    }
    
    return currentStats.queueMetrics.muCalculationDetails;
  }
}
