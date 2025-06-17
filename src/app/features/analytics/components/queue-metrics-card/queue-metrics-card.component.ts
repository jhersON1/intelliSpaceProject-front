import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QueueMetrics, CongestionStatus } from '../../../../core/types/analytics.interface';

@Component({
  selector: 'app-queue-metrics-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-xl font-semibold text-gray-800">Factor de Utilización (ρ)</h3>
        <div class="px-4 py-2 rounded-full text-sm font-medium"
             [class]="statusClasses()">
          {{ statusText() }}
        </div>
      </div>
      
      <!-- Main Metric -->
      <div class="text-4xl font-bold text-gray-900 mb-2">
        {{ formattedRho() }}
      </div>
      
      <!-- Formula -->
      <div class="text-gray-600 mb-4">
        λ={{ formattedLambda() }} / μ={{ formattedMu() }}
      </div>
      
      <!-- Progress Bar -->
      <div class="w-full bg-gray-200 rounded-full h-3 mb-4">
        <div class="h-3 rounded-full transition-all duration-500"
             [class]="progressBarClass()"
             [style.width]="progressWidth() + '%'">
        </div>
      </div>
      
      <!-- Description -->
      <div class="text-sm text-gray-600">
        {{ metrics()?.message || 'Calculando métricas...' }}
      </div>
      
      <!-- Metrics Details -->
      @if (showDetails()) {
        <div class="mt-4 pt-4 border-t border-gray-100">
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="font-medium text-gray-700">Tasa de llegadas (λ):</span>
              <p class="text-gray-600">{{ formattedLambda() }} clicks/día</p>
            </div>
            <div>
              <span class="font-medium text-gray-700">Tasa de servicio (μ):</span>
              <p class="text-gray-600">{{ formattedMu() }} repos./día</p>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class QueueMetricsCardComponent {
  metrics = input<QueueMetrics | null>(null);
  showDetails = input(false);

  // Computed values
  formattedRho = computed(() => {
    const rho = this.metrics()?.rho;
    return rho !== undefined ? rho.toFixed(3) : '0.000';
  });

  formattedLambda = computed(() => {
    const lambda = this.metrics()?.lambda;
    return lambda !== undefined ? lambda.toFixed(2) : '0.00';
  });

  formattedMu = computed(() => {
    const mu = this.metrics()?.mu;
    return mu !== undefined ? mu.toFixed(2) : '0.00';
  });

  statusText = computed(() => {
    const status = this.metrics()?.status;
    switch (status) {
      case 'CRITICO': return 'Crítico';
      case 'ADVERTENCIA': return 'Advertencia';
      case 'ESTABLE': return 'Estable';
      default: return 'Calculando...';
    }
  });

  statusClasses = computed(() => {
    const status = this.metrics()?.status;
    switch (status) {
      case 'CRITICO':
        return 'bg-red-100 text-red-800 border border-red-200';
      case 'ADVERTENCIA':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'ESTABLE':
        return 'bg-green-100 text-green-800 border border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  });

  progressBarClass = computed(() => {
    const status = this.metrics()?.status;
    switch (status) {
      case 'CRITICO':
        return 'bg-red-500';
      case 'ADVERTENCIA':
        return 'bg-yellow-500';
      case 'ESTABLE':
        return 'bg-green-500';
      default:
        return 'bg-gray-400';
    }
  });

  progressWidth = computed(() => {
    const rho = this.metrics()?.rho || 0;
    // Limitar el ancho al 100% máximo
    return Math.min(rho * 100, 100);
  });
}
