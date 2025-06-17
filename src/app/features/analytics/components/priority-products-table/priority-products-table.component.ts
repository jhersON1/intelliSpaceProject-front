import { Component, Output, EventEmitter, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PriorityProduct } from '../../../../core/types/analytics.interface';

@Component({
  selector: 'app-priority-products-table',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <h3 class="text-lg font-semibold text-gray-800">
          {{ title() }}
        </h3>
        <p class="text-sm text-gray-600 mt-1">
          Productos ordenados por prioridad de reposición
        </p>
      </div>

      <!-- Table Content -->
      <div class="overflow-x-auto">
        @if (products().length === 0) {
          <div class="px-6 py-12 text-center">
            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-4v4M7 9v4" />
            </svg>
            <h3 class="mt-2 text-sm font-medium text-gray-900">No hay productos</h3>
            <p class="mt-1 text-sm text-gray-500">
              {{ emptyMessage() }}
            </p>
          </div>
        } @else {
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Producto
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Factor ρ
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prioridad
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Última Repos.
                </th>
                <th class="relative px-6 py-3"><span class="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              @for (product of products(); track product.id) {
                <tr class="hover:bg-gray-50 transition-colors">
                  <!-- Product Name -->
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">
                      {{ product.name }}
                    </div>
                    <div class="text-sm text-gray-500">
                      ID: {{ product.id.substring(0, 8) }}...
                    </div>
                  </td>

                  <!-- Status -->
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                          [class]="getStatusClasses(product.congestionStatus)">
                      {{ getStatusText(product.congestionStatus) }}
                    </span>
                  </td>                  <!-- Utilization Factor -->                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900 font-mono">
                      {{ getUtilizationText(product.utilizationFactor) }}
                    </div>
                    <div class="w-16 bg-gray-200 rounded-full h-2 mt-1">
                      <div class="h-2 rounded-full transition-all duration-300"
                           [class]="getProgressBarClass(product.congestionStatus)"
                           [style.width]="getUtilizationPercentage(product.utilizationFactor) + '%'">
                      </div>
                    </div>
                  </td>

                  <!-- Priority -->
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                      <span class="text-sm font-medium text-gray-900">
                        {{ product.priority }}
                      </span>
                      @if (product.priority <= 3) {
                        <svg class="ml-1 h-4 w-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                        </svg>
                      }
                    </div>
                  </td>

                  <!-- Last Reposition -->
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {{ formatDate(product.lastReposition) }}
                  </td>

                  <!-- Actions -->
                  <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      (click)="onProductClick(product)"
                      class="text-indigo-600 hover:text-indigo-900 transition-colors">
                      Ver detalles
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>

      <!-- Footer -->
      @if (showFooter() && products().length > 0) {
        <div class="px-6 py-3 bg-gray-50 border-t border-gray-200">
          <div class="flex items-center justify-between">
            <div class="text-sm text-gray-500">
              Mostrando {{ products().length }} productos
            </div>
            @if (hasMoreProducts()) {
              <button
                (click)="onLoadMore()"
                class="text-sm text-indigo-600 hover:text-indigo-900 font-medium">
                Ver más productos
              </button>
            }
          </div>
        </div>
      }
    </div>
  `
})
export class PriorityProductsTableComponent {
  // Using new signal inputs (Angular 18+)
  products = input<PriorityProduct[]>([]);
  title = input('Productos Prioritarios');
  emptyMessage = input('No hay productos que requieran atención');
  showFooter = input(true);
  hasMoreProducts = input(false);
  
  @Output() productClick = new EventEmitter<PriorityProduct>();
  @Output() loadMore = new EventEmitter<void>();

  // Expose Math for template
  Math = Math;

  onProductClick(product: PriorityProduct): void {
    this.productClick.emit(product);
  }

  onLoadMore(): void {
    this.loadMore.emit();
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
      case 'CRITICO':
        return 'bg-red-100 text-red-800';
      case 'ADVERTENCIA':
        return 'bg-yellow-100 text-yellow-800';
      case 'ESTABLE':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getProgressBarClass(status: string): string {
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
  }  formatDate(date: Date): string {
    if (!date) return 'N/A';
    
    try {
      const parsedDate = new Date(date);
      const now = new Date();
      
      // 🔧 FIX: Comparar solo fechas (sin horas) para cálculo preciso de días
      const parsedDateOnly = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());
      const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      const diffTime = Math.abs(nowDateOnly.getTime() - parsedDateOnly.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        // 🕐 Mostrar "Hoy" + hora cuando es el día actual
        const timeString = parsedDate.toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        return `Hoy ${timeString}`;
      }
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

  /**
   * Get utilization factor text with safe handling
   */
  getUtilizationText(factor: number): string {
    try {
      return (factor || 0).toFixed(3);
    } catch {
      return '0.000';
    }
  }

  /**
   * Get utilization percentage for progress bar
   */
  getUtilizationPercentage(factor: number): number {
    try {
      return Math.min((factor || 0) * 100, 100);
    } catch {
      return 0;
    }
  }
}
