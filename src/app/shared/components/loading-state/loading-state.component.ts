import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Componente reutilizable para mostrar diferentes estados de carga
 */
@Component({
  selector: 'app-loading-state',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isLoading) {
      <div class="flex flex-col items-center justify-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
        
        @if (message) {
          <p class="text-gray-600 text-center">{{ message }}</p>
        }
        
        @if (showSkeleton) {
          <div class="w-full mt-8">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              @for (item of skeletonItems; track $index) {
                <div class="bg-white rounded-lg shadow-md animate-pulse">

                  <div class="aspect-square bg-gray-200 rounded-t-lg"></div>
                  
                  <div class="p-4">
                    <div class="h-4 bg-gray-200 rounded mb-2"></div>
                    <div class="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div class="h-6 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              }
            </div>
          </div>
        }
      </div>
    } @else if (hasError) {
      <div class="flex flex-col items-center justify-center py-12">
        <svg class="h-12 w-12 text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z">
          </path>
        </svg>
        
        <h3 class="text-lg font-medium text-gray-900 mb-2">{{ errorTitle }}</h3>
        <p class="text-gray-600 text-center mb-4">{{ errorMessage }}</p>
        
        @if (showRetry) {
          <button 
            (click)="onRetry()"
            class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
            Reintentar
          </button>
        }
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoadingStateComponent {
  @Input() isLoading = false;
  @Input() hasError = false;
  @Input() message = 'Cargando...';
  @Input() errorTitle = 'Ocurrió un error';
  @Input() errorMessage = 'No se pudieron cargar los datos. Por favor, inténtalo de nuevo.';
  @Input() showRetry = true;
  @Input() showSkeleton = false;
  @Input() skeletonCount = 8;

  get skeletonItems(): number[] {
    return Array(this.skeletonCount).fill(0);
  }

  onRetry(): void {
    window.location.reload();
  }
}
