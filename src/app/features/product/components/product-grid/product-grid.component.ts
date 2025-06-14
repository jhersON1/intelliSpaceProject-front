import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ProductWithImage {
  id: string;
  title: string;
  price?: number;
  imageUrl?: string | string[];
  imageAlt?: string;
}

export interface PaginationData {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  hasMore: boolean;
}

/**
 * Componente tonto para mostrar la lista de productos
 * Solo se encarga de la presentación, sin lógica de negocio
 */
@Component({
  selector: 'app-product-grid',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      @for (product of products; track product.id) {
        <div class="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 cursor-pointer"
             (click)="onProductClick(product)">
          <div class="aspect-square overflow-hidden rounded-t-lg">
            @if (product.imageUrl) {
              <img 
                [src]="getImageUrl(product.imageUrl)" 
                [alt]="product.imageAlt || product.title"
                class="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            } @else {
              <div class="w-full h-full bg-gray-200 flex items-center justify-center">
                <svg class="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z">
                  </path>
                </svg>
              </div>
            }
          </div>
          
          <div class="p-4">
            <h3 class="font-semibold text-gray-900 text-lg mb-2 line-clamp-2">
              {{ product.title }}
            </h3>
            
            @if (product.price) {
              <p class="text-2xl font-bold text-indigo-600">
                {{ product.price | currency:'USD':'symbol':'1.2-2' }}
              </p>
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
      <div class="mt-8 flex justify-center">
        <nav class="flex items-center space-x-2">
          <button 
            (click)="onPageChange(pagination.currentPage - 1)"
            [disabled]="pagination.currentPage <= 1"
            class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
            Anterior
          </button>
          
          @for (page of getPageNumbers(); track page) {
            <button 
              (click)="onPageChange(page)"
              [class]="page === pagination.currentPage 
                ? 'px-3 py-2 text-sm font-medium text-white bg-indigo-600 border border-indigo-600 rounded-md'
                : 'px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50'">
              {{ page }}
            </button>
          }
          
          <button 
            (click)="onPageChange(pagination.currentPage + 1)"
            [disabled]="pagination.currentPage >= pagination.totalPages"
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
  
  @Output() productClick = new EventEmitter<ProductWithImage>();
  @Output() pageChange = new EventEmitter<number>();

  onProductClick(product: ProductWithImage): void {
    this.productClick.emit(product);
  }

  onPageChange(page: number): void {
    if (this.pagination && page >= 1 && page <= this.pagination.totalPages) {
      this.pageChange.emit(page);
    }
  }

  getImageUrl(imageUrl: string | string[]): string {
    if (Array.isArray(imageUrl)) {
      return imageUrl[0] || '';
    }
    return imageUrl || '';
  }

  getPageNumbers(): number[] {
    if (!this.pagination) return [];
    
    const { currentPage, totalPages } = this.pagination;
    const pages: number[] = [];
    
    // Mostrar máximo 5 páginas
    const maxPages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPages / 2));
    let endPage = Math.min(totalPages, startPage + maxPages - 1);
    
    // Ajustar si no hay suficientes páginas al final
    if (endPage - startPage + 1 < maxPages) {
      startPage = Math.max(1, endPage - maxPages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  }
}
