import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ProductWithImage {
  id: string;
  title: string;
  price?: number;
  description?: string;
  imageUrl?: string | string[];
  imageAlt?: string;

  analytics?: {
    totalClicks: number;
    congestionStatus: 'ESTABLE' | 'ADVERTENCIA' | 'CRITICO';
    utilizationFactor: number;
    arrivalRate: number;
  };
}

export interface PaginationData {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  hasMore: boolean;
}

@Component({
  selector: 'app-product-grid',
  standalone: true,
  imports: [CommonModule],  template: `
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">      @for (product of products; track product.id) {
        <div class="product-card flex flex-col cursor-pointer relative" (click)="onProductClick(product)">

          @if (product.analytics) {
            <div class="absolute top-2 left-2 z-10 flex flex-col gap-1">
              @if (product.analytics.congestionStatus !== 'ESTABLE') {
                <span [class]="getCongestionStatusClass(product.analytics.congestionStatus)" 
                      class="px-2 py-1 text-xs font-medium rounded-full">
                  @if (product.analytics.congestionStatus === 'CRITICO') {
                    🚨 Crítico
                  } @else {
                    ⚠️ Advertencia
                  }
                </span>
              }
              
              @if (product.analytics.totalClicks > 100) {
                <span class="bg-blue-100 text-blue-800 px-2 py-1 text-xs font-medium rounded-full">
                  🔥 {{ formatClicks(product.analytics.totalClicks) }}
                </span>
              }
            </div>
            
            <div class="absolute bottom-2 right-2 z-10">
              <div class="bg-black/70 text-white px-2 py-1 rounded-full text-xs">
                ρ: {{ formatUtilization(product.analytics.utilizationFactor) }}
              </div>
            </div>
          }

          <div class="w-full min-w-[280px] h-[450px] overflow-hidden">
            @if (product.imageUrl) {
              <img 
                [src]="getImageUrl(product.imageUrl)" 
                [alt]="product.imageAlt || product.title"
                class="w-full h-full object-cover object-center opacity-90 transition-transform duration-300 hover:scale-105"
                loading="lazy"
                (error)="onImageError($event, product)"
              />
            } @else {
              <div class="w-full h-full bg-gray-100 flex items-center justify-center opacity-90">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            }
          </div>
          
          <div class="flex-1 flex flex-col justify-between">
            <div>
              <h3 class="text-lg md:text-xl font-normal mt-4">{{ product.title }}</h3>
              <p class="text-sm text-neutral-400">{{ getProductDescription(product) }}</p>
            </div>
            
            @if (product.analytics) {
              <div class="mt-3 pt-3 border-t border-gray-100">
                <div class="flex items-center justify-between text-xs text-gray-500">
                  <span>{{ product.analytics.totalClicks }} views</span>
                  <span>λ: {{ formatRate(product.analytics.arrivalRate) }}/día</span>
                </div>

                <div class="mt-1 w-full bg-gray-200 rounded-full h-1">
                  <div 
                    [class]="getUtilizationBarClass(product.analytics.utilizationFactor)"
                    [style.width]="(product.analytics.utilizationFactor * 100) + '%'"
                    class="h-1 rounded-full transition-all duration-300">
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      } @empty {
        <div class="col-span-full text-center py-12">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4">
            </path>
          </svg>
          <h3 class="mt-2 text-sm font-medium text-gray-900">No hay productos</h3>
          <p class="mt-1 text-sm text-gray-500">{{ emptyMessage }}</p>
        </div>
      }
    </div>

    <!-- Paginación -->
    @if (pagination && pagination.totalPages > 1) {
      <div class="mt-8 flex justify-center">        <nav class="flex items-center space-x-2">
          <button 
            (click)="onPageChange(pagination.currentPage - 1)"
            [disabled]="pagination.currentPage <= 1 || isLoading"
            class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
            Anterior
          </button>
          
          @for (page of getPageNumbers(); track page) {
            <button 
              (click)="onPageChange(page)"
              [disabled]="isLoading"
              [class]="page === pagination.currentPage 
                ? 'px-3 py-2 text-sm font-medium text-white bg-indigo-600 border border-indigo-600 rounded-md disabled:opacity-50'
                : 'px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'">
              {{ page }}
            </button>
          }
          
          <button 
            (click)="onPageChange(pagination.currentPage + 1)"
            [disabled]="pagination.currentPage >= pagination.totalPages || isLoading"
            class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
            Siguiente
          </button>
        </nav>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductGridComponent {
  @Input() products: ProductWithImage[] = [];
  @Input() pagination: PaginationData | null = null;
  @Input() emptyMessage = 'No se encontraron productos disponibles.';
  @Input() isLoading = false;
  
  @Output() productClick = new EventEmitter<ProductWithImage>();
  @Output() pageChange = new EventEmitter<number>();

  onProductClick(product: ProductWithImage): void {
    this.productClick.emit(product);
  }

  onPageChange(page: number): void {
    if (this.isLoading) {
      return;
    }
    
    if (this.pagination && page >= 1 && page <= this.pagination.totalPages && page !== this.pagination.currentPage) {
      this.pageChange.emit(page);
    }
  }

  getImageUrl(imageUrl: string | string[]): string {
    if (Array.isArray(imageUrl)) {
      return imageUrl[0] || '';
    }
    return imageUrl || '';
  }

  getProductDescription(product: ProductWithImage): string {
    return product.description || 'Descripción no especificada';
  }

  getPageNumbers(): number[] {
    if (!this.pagination) return [];
    
    const { currentPage, totalPages } = this.pagination;
    const pages: number[] = [];
    
    const maxPages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPages / 2));
    let endPage = Math.min(totalPages, startPage + maxPages - 1);
    
    if (endPage - startPage + 1 < maxPages) {
      startPage = Math.max(1, endPage - maxPages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  onImageError(event: Event, product: ProductWithImage): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.style.display = 'none';
      
      const container = target.parentElement;
      if (container && !container.querySelector('.error-placeholder')) {
        const placeholder = document.createElement('div');
        placeholder.className = 'error-placeholder w-full h-full bg-gray-100 flex items-center justify-center opacity-90';
        placeholder.innerHTML = `
          <div class="text-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.684-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p class="text-xs text-gray-500">Imagen no disponible</p>
          </div>
        `;
        container.appendChild(placeholder);
      }
    }
  }

  getCongestionStatusClass(status: 'ESTABLE' | 'ADVERTENCIA' | 'CRITICO'): string {
    switch (status) {
      case 'CRITICO':
        return 'bg-red-100 text-red-800 border border-red-200';
      case 'ADVERTENCIA':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      default:
        return 'bg-green-100 text-green-800 border border-green-200';
    }
  }

  formatClicks(clicks: number): string {
    if (clicks >= 1000) {
      return (clicks / 1000).toFixed(1) + 'k';
    }
    return clicks.toString();
  }

  formatUtilization(utilization: number): string {
    return (utilization * 100).toFixed(1) + '%';
  }

  formatRate(rate: number): string {
    return rate.toFixed(1);
  }

  getUtilizationBarClass(utilization: number): string {
    if (utilization >= 0.9) {
      return 'bg-red-500';
    } else if (utilization >= 0.7) {
      return 'bg-yellow-500';
    } else {
      return 'bg-green-500';
    }
  }
}
