import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductAlert } from '../../../../core/types/analytics.interface';

@Component({
  selector: 'app-vendor-alerts',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-gray-800">
            Alertas Activas
          </h3>
          @if (alerts().length > 0) {
            <span class="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
              {{ alerts().length }} alertas
            </span>
          }
        </div>
      </div>

      <!-- Alerts List -->
      <div class="max-h-96 overflow-y-auto">
        @if (alerts().length === 0) {
          <div class="px-6 py-12 text-center">
            <svg class="mx-auto h-12 w-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 class="mt-2 text-sm font-medium text-gray-900">¡Todo en orden!</h3>
            <p class="mt-1 text-sm text-gray-500">
              No hay alertas activas en este momento
            </p>
          </div>
        } @else {
          <div class="divide-y divide-gray-200">
            @for (alert of sortedAlerts(); track alert.productId) {
              <div class="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div class="flex items-start space-x-3">
                  <!-- Alert Icon -->
                  <div class="flex-shrink-0">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center"
                         [class]="getAlertIconClasses(alert.severity)">
                      @switch (alert.severity) {
                        @case ('CRITICAL') {
                          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                          </svg>
                        }
                        @case ('HIGH') {
                          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                          </svg>
                        }
                        @default {
                          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                          </svg>
                        }
                      }
                    </div>
                  </div>

                  <!-- Alert Content -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between">
                      <h4 class="text-sm font-medium text-gray-900 truncate">
                        {{ alert.productName }}
                      </h4>
                      <span class="text-xs px-2 py-1 rounded-full font-medium"
                            [class]="getSeverityClasses(alert.severity)">
                        {{ getSeverityText(alert.severity) }}
                      </span>
                    </div>
                    
                    <p class="mt-1 text-sm text-gray-600">
                      {{ alert.message }}
                    </p>
                    
                    <div class="mt-2 flex items-center text-xs text-gray-500">
                      <span class="capitalize">{{ getAlertTypeText(alert.alertType) }}</span>
                      <span class="mx-2">•</span>
                      <span>{{ formatDate(alert.createdAt) }}</span>
                    </div>
                  </div>

                  <!-- Action Button -->
                  <div class="flex-shrink-0">
                    <button
                      (click)="onAlertClick(alert)"
                      class="text-indigo-600 hover:text-indigo-900 text-sm font-medium transition-colors">
                      Ver producto
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `
})
export class VendorAlertsComponent {
  alerts = input<ProductAlert[]>([]);

  // Sorted alerts by severity and date
  sortedAlerts = computed(() => {
    return [...this.alerts()].sort((a, b) => {
      // Priority order: CRITICAL > HIGH > MEDIUM > LOW
      const severityOrder: Record<string, number> = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 };
      const severityDiff = (severityOrder[a.severity] || 3) - (severityOrder[b.severity] || 3);
      
      if (severityDiff !== 0) return severityDiff;
      
      // If same severity, sort by date (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  });

  onAlertClick(alert: ProductAlert): void {
    // Emit or navigate to product detail
    console.log('Alert clicked:', alert);
  }

  getSeverityText(severity: string): string {
    switch (severity) {
      case 'CRITICAL': return 'Crítico';
      case 'HIGH': return 'Alto';
      case 'MEDIUM': return 'Medio';
      case 'LOW': return 'Bajo';
      default: return 'Desconocido';
    }
  }

  getSeverityClasses(severity: string): string {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800';
      case 'LOW':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getAlertIconClasses(severity: string): string {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-600';
      case 'HIGH':
        return 'bg-orange-100 text-orange-600';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-600';
      case 'LOW':
        return 'bg-blue-100 text-blue-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  }

  getAlertTypeText(alertType: string): string {
    switch (alertType) {
      case 'CRITICAL_STOCK': return 'Stock crítico';
      case 'HIGH_DEMAND': return 'Alta demanda';
      case 'REPOSITION_NEEDED': return 'Reposición necesaria';
      default: return 'Alerta general';
    }
  }

  formatDate(date: Date): string {
    if (!date) return 'N/A';
    
    try {
      const parsedDate = new Date(date);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - parsedDate.getTime());
      const diffMinutes = Math.floor(diffTime / (1000 * 60));
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffMinutes < 60) return `Hace ${diffMinutes}m`;
      if (diffHours < 24) return `Hace ${diffHours}h`;
      if (diffDays === 1) return 'Ayer';
      if (diffDays <= 7) return `Hace ${diffDays} días`;
      
      return parsedDate.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short'
      });
    } catch {
      return 'N/A';
    }
  }
}
