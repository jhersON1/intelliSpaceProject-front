import { ChangeDetectionStrategy, Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';

import { Product } from '../../interfaces/product.interface';
import { ProductsService, PaginatedResponse } from '../../services/products.service';
import { VisualRepresentationService } from '../../services/visual-representation.service';
import { LoadingStateService } from '../../../../core/services/loading-state.service';
import { NotificationStateService } from '../../../../core/services/notification-state.service';
import { LoggerService } from '../../../../core/services';

import { ProductGridComponent, ProductWithImage, PaginationData } from '../../components/product-grid/product-grid.component';
import { LoadingStateComponent } from '../../../../shared/components/loading-state/loading-state.component';

/**
 * Componente inteligente que maneja la lógica de negocio para la lista de productos
 */
@Component({
  selector: 'app-product-list',
  imports: [CommonModule, FormsModule, ProductGridComponent, LoadingStateComponent],
  template: `
    <div class="container mx-auto px-4 py-8">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">Productos Disponibles</h1>
        <p class="text-gray-600">Descubre nuestra colección de productos</p>
      </div>

      <!-- Estados de carga y error -->
      <app-loading-state
        [isLoading]="isLoading()"
        [hasError]="hasError()"
        [showSkeleton]="true"
        message="Cargando productos..."
        errorTitle="Error al cargar productos"
        errorMessage="No se pudieron cargar los productos. Por favor, inténtalo de nuevo.">
      </app-loading-state>

      <!-- Grid de productos -->
      @if (!isLoading() && !hasError()) {
        <app-product-grid
          [products]="productsWithImages()"
          [pagination]="paginationData()"
          (productClick)="onProductClick($event)"
          (pageChange)="onPageChange($event)">
        </app-product-grid>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductListComponent implements OnInit {
  private readonly productService = inject(ProductsService);
  private readonly visualService = inject(VisualRepresentationService);
  private readonly router = inject(Router);
  private readonly loadingState = inject(LoadingStateService);
  private readonly notificationState = inject(NotificationStateService);
  private readonly logger = inject(LoggerService);

  // Signals para el estado del componente
  private readonly _products = signal<Product[]>([]);
  private readonly _productsWithImages = signal<ProductWithImage[]>([]);
  private readonly _currentPage = signal(1);
  private readonly _totalItems = signal(0);
  private readonly _totalPages = signal(0);
  private readonly _hasMore = signal(false);
  private readonly _hasError = signal(false);

  // Signals computadas públicas
  public readonly productsWithImages = computed(() => this._productsWithImages());
  public readonly isLoading = computed(() => this.loadingState.isLoadingOperation('loadProducts'));
  public readonly hasError = computed(() => this._hasError());
  public readonly paginationData = computed((): PaginationData | null => {
    const totalPages = this._totalPages();
    if (totalPages <= 1) return null;
    
    return {
      currentPage: this._currentPage(),
      totalPages,
      totalItems: this._totalItems(),
      hasMore: this._hasMore()
    };
  });

  // Configuración
  private readonly pageSize = 10;

  ngOnInit(): void {
    this.loadProducts();
  }

  /**
   * Carga los productos y sus imágenes
   */
  private loadProducts(): void {
    const loadingKey = 'loadProducts';
    this._hasError.set(false);
    this.loadingState.startLoading(loadingKey, 'Cargando productos...');

    const offset = (this._currentPage() - 1) * this.pageSize;

    this.productService.findAllProducts(this.pageSize, offset).subscribe({
      next: (response: PaginatedResponse<Product>) => {
        this.logger.debug('Productos cargados', { count: response.data.length }, 'ProductListComponent');
        
        if (response.data && response.data.length > 0) {
          this._totalItems.set(response.total);
          this._hasMore.set(response.hasMore);
          this._totalPages.set(Math.ceil(response.total / this.pageSize));
          
          this.loadProductImages(response.data);
        } else {
          this.resetProductState();
        }
      },
      error: (error) => {
        this.logger.error('Error al cargar productos', { error }, 'ProductListComponent');
        this._hasError.set(true);
        this.notificationState.error('Error al cargar los productos');
        this.loadingState.stopLoading(loadingKey);
      }
    });
  }

  /**
   * Carga las imágenes para los productos
   */
  private loadProductImages(products: Product[]): void {
    const imageRequests = products.map(product =>
      this.visualService.findAllImages(product.id).pipe(
        catchError((error) => {
          this.logger.warn('Error al cargar imagen para producto', { 
            productId: product.id, 
            error 
          }, 'ProductListComponent');
          return of([]);
        })
      )
    );

    forkJoin(imageRequests).subscribe({
      next: (imageArrays) => {
        const productsWithImages: ProductWithImage[] = products.map((product, index) => {
          const images = imageArrays[index];
          const imageUrl = images.length > 0 ? images[0].url : undefined;
          
          return {
            ...product,
            imageUrl,
            imageAlt: `Imagen de ${product.title}`
          };
        });

        this._products.set(products);
        this._productsWithImages.set(productsWithImages);
        this.loadingState.stopLoading('loadProducts');
      },
      error: (error) => {
        this.logger.error('Error al cargar imágenes', { error }, 'ProductListComponent');
        this._hasError.set(true);
        this.loadingState.stopLoading('loadProducts');
      }
    });
  }

  /**
   * Resetea el estado de productos cuando no hay datos
   */
  private resetProductState(): void {
    this._products.set([]);
    this._productsWithImages.set([]);
    this._totalItems.set(0);
    this._hasMore.set(false);
    this._totalPages.set(0);
    this.loadingState.stopLoading('loadProducts');
  }

  /**
   * Maneja el click en un producto
   */
  onProductClick(product: ProductWithImage): void {
    this.logger.info('Navegando a detalle de producto', { productId: product.id }, 'ProductListComponent');
    this.router.navigate(['/products', product.id]);
  }

  /**
   * Maneja el cambio de página
   */
  onPageChange(page: number): void {
    if (page === this._currentPage()) return;
    
    this.logger.debug('Cambiando página', { from: this._currentPage(), to: page }, 'ProductListComponent');
    this._currentPage.set(page);
    this.loadProducts();
  }
}
