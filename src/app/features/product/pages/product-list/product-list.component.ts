import { ChangeDetectionStrategy, Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, forkJoin, of, Subject, takeUntil, switchMap, debounceTime, Observable, map } from 'rxjs';

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
  imports: [CommonModule, FormsModule, ProductGridComponent, LoadingStateComponent],  template: `
    <div class="container mx-auto px-4 py-8">
      <div class="mb-8 flex justify-between items-center">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 mb-2">Productos Disponibles</h1>
          <p class="text-gray-600">Descubre nuestra colección de productos</p>
        </div>
        
        <!-- Botón de actualizar para demostrar el caché -->
        <button 
          (click)="refreshProducts()"
          [disabled]="isLoading()"
          class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
          @if (isLoading()) {
            <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" class="opacity-25"></circle>
              <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" class="opacity-75"></path>
            </svg>
          } @else {
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          }
          Actualizar
        </button>
      </div>      <!-- Estados de carga y error usando @if -->
      @if (isLoading() || hasError()) {
        <app-loading-state
          [isLoading]="isLoading()"
          [hasError]="hasError()"
          [showSkeleton]="true"
          message="Cargando productos..."
          errorTitle="Error al cargar productos"
          errorMessage="No se pudieron cargar los productos. Por favor, inténtalo de nuevo.">
        </app-loading-state>
      } @else {
        <!-- Grid de productos -->
        <app-product-grid
          [products]="productsWithImages()"
          [pagination]="paginationData()"
          [isLoading]="isLoading()"
          (productClick)="onProductClick($event)"
          (pageChange)="onPageChange($event)">
        </app-product-grid>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductListComponent implements OnInit, OnDestroy {
  private readonly productService = inject(ProductsService);
  private readonly visualService = inject(VisualRepresentationService);
  private readonly router = inject(Router);  private readonly loadingState = inject(LoadingStateService);
  private readonly notificationState = inject(NotificationStateService);
  private readonly logger = inject(LoggerService);

  // Subject para manejo de suscripciones
  private readonly destroy$ = new Subject<void>();
  private readonly pageChange$ = new Subject<number>();

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
    this.setupPageChangeHandler();
    this.loadProducts();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  /**
   * Configura el manejo de cambios de página con debounce
   */
  private setupPageChangeHandler(): void {
    this.pageChange$
      .pipe(
        debounceTime(100), // Reducir debounce a 100ms
        switchMap((page) => {
          this.logger.info('Cambiando a página', { page });
          this._currentPage.set(page);
          return this.loadProductsObservable();
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: () => {
          this.logger.info('Página cargada exitosamente');
        },
        error: (error: any) => {
          this.logger.error('Error al cambiar de página', error);
          this._hasError.set(true);
          this.loadingState.stopLoading('loadProducts');
          this.notificationState.error('Error al cambiar de página. Por favor, inténtalo de nuevo.');
        }
      });
  }

  /**
   * Refresca los productos limpiando el caché
   */
  refreshProducts(): void {
    // Invalidar caché de productos para forzar nueva carga
    const pattern = /^products_/;
    const invalidatedCount = this.productService['cacheService'].invalidatePattern(pattern);
    this.logger.info('Caché de productos invalidado', { invalidatedCount });
    
    this._currentPage.set(1);
    this.loadProducts();
    this.notificationState.success('Productos actualizados desde el servidor');
  }
  /**
   * Carga los productos (versión síncrona para uso interno)
   */
  private loadProducts(): void {
    this.loadProductsObservable()
      .pipe(takeUntil(this.destroy$))      .subscribe({
        next: () => {
          this.logger.info('Productos cargados exitosamente desde loadProducts');
        },
        error: (error: any) => {
          this.logger.error('Error en loadProducts', error);
        }
      });
  }

  /**
   * Carga los productos con paginación (versión observable)
   */
  private loadProductsObservable(): Observable<void> {
    this._hasError.set(false);
    this.loadingState.startLoading('loadProducts', 'Cargando productos...');
    
    const offset = (this._currentPage() - 1) * this.pageSize;

    return this.productService.findAllProducts(this.pageSize, offset).pipe(
      switchMap((response: PaginatedResponse<Product>) => {
        this.logger.info('Productos cargados exitosamente', { 
          total: response.total, 
          count: response.data?.length || 0 
        });
        
        if (response.data && response.data.length > 0) {
          this._products.set(response.data);
          this._totalItems.set(response.total);
          this._hasMore.set(response.hasMore);
          this.calculateTotalPages();
          return this.loadProductsWithImagesObservable(response.data);
        } else {
          this.logger.info('No hay productos disponibles');
          this.resetProductState();
          return of(undefined);
        }
      }),
      map(() => void 0), // Convertir a void
      catchError((error) => {
        this.logger.error('Error al cargar productos', error);
        this._hasError.set(true);
        this.loadingState.stopLoading('loadProducts');
        this.notificationState.error('Error al cargar productos. No se pudieron cargar los productos. Por favor, inténtalo de nuevo.');
        return of(void 0);
      })
    );
  }  /**
   * Carga las imágenes de los productos en paralelo (versión observable)
   */
  private loadProductsWithImagesObservable(products: Product[]): Observable<void> {
    if (products.length === 0) {
      this.resetProductState();
      return of(void 0);
    }

    // Crear observables para cargar todas las imágenes en paralelo
    const imageRequests = products.map(product => {
      return this.visualService.findPrincipalImage(product.id).pipe(
        catchError((error: any) => {
          // No loguear como error, es normal que algunos productos no tengan imagen
          this.logger.debug('Producto sin imagen principal', { productId: product.id });
          return of(null);
        }),
        takeUntil(this.destroy$) // Cancelar si el componente se destruye
      );
    });

    return forkJoin(imageRequests).pipe(
      map((images) => {
        const productsWithImages: ProductWithImage[] = products.map((product, index) => {
          const image = images[index];
          return {
            ...product,
            imageUrl: image?.url || undefined,
            imageAlt: image?.altText || product.title
          };
        });
        
        this._productsWithImages.set(productsWithImages);
        this.loadingState.stopLoading('loadProducts');
        return void 0;
      }),
      catchError((error: any) => {
        this.logger.error('Error crítico al cargar imágenes de productos', error);
        // Continuar sin imágenes
        const productsWithoutImages: ProductWithImage[] = products.map(p => ({ 
          ...p, 
          imageAlt: p.title 
        }));
        
        this._productsWithImages.set(productsWithoutImages);
        this.loadingState.stopLoading('loadProducts');
        return of(void 0);
      })
    );
  }

  /**
   * Carga las imágenes de los productos en paralelo (versión síncrona para compatibilidad)
   */
  private loadProductsWithImages(products: Product[]): void {
    this.loadProductsWithImagesObservable(products)
      .pipe(takeUntil(this.destroy$))
      .subscribe();
  }

  /**
   * Resetea el estado de productos a valores por defecto
   */
  private resetProductState(): void {
    this._products.set([]);
    this._productsWithImages.set([]);
    this._totalItems.set(0);
    this._hasMore.set(false);
    this.calculateTotalPages();
    this.loadingState.stopLoading('loadProducts');
  }

  /**
   * Calcula el total de páginas basado en los elementos totales
   */
  private calculateTotalPages(): void {
    const totalItems = this._totalItems();
    if (totalItems > 0) {
      this._totalPages.set(Math.ceil(totalItems / this.pageSize));
    } else {
      // Si no tenemos un total exacto, calculamos basado en si hay más páginas
      const currentPage = this._currentPage();
      const hasMore = this._hasMore();
      this._totalPages.set(hasMore ? currentPage + 1 : currentPage);
    }
  }

  // Event handlers para el ProductGridComponent

  /**
   * Maneja el clic en un producto
   */
  onProductClick(product: ProductWithImage): void {
    this.logger.info('Navegando a detalles del producto', { productId: product.id, title: product.title });
    this.router.navigate(['/home/products', product.id, 'detail']);
  }  /**
   * Maneja el cambio de página
   */
  onPageChange(page: number): void {
    // Evitar cambios innecesarios
    if (page === this._currentPage()) {
      return;
    }
    
    // Usar el Subject con debounce para evitar múltiples llamadas rápidas
    this.pageChange$.next(page);
  }
}
