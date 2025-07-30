import { Component, input, output, inject, signal, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PriorityProduct } from '../../../../core/types/analytics.interface';
import { AnalyticsService } from '../../../../core/services/analytics.service';

// Interface temporal para los datos reales del backend
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
  queueMetrics: any;
}

@Component({
  selector: 'app-product-analytics-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
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
            @if (loading()) {
              <div class="flex justify-center items-center py-12">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                <span class="ml-3 text-gray-600 text-lg">Cargando métricas...</span>
              </div>
            }

            <!-- Content -->
            @if (!loading() && stats()) {
              <div class="space-y-6">
                
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
                  </div>
                </div>

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
      
      this.analyticsService.getProductStats(currentProduct.id).subscribe({        next: (productStats) => {
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
}
