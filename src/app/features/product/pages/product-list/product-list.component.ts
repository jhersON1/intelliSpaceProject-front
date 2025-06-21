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
// Import analytics service and types
import { AnalyticsService } from '../../../../core/services/analytics.service';
import { AuthService } from '../../../../auth/services/auth.service';
import { ProductAnalytics } from '../../../../core/types/analytics.interface';

import { ProductGridComponent, ProductWithImage, PaginationData } from '../../components/product-grid/product-grid.component';
import { LoadingStateComponent } from '../../../../shared/components/loading-state/loading-state.component';

/**
 * Componente inteligente que maneja la lógica de negocio para la lista de productos
 */
@Component({
  selector: 'app-product-list',
  imports: [CommonModule, FormsModule, ProductGridComponent, LoadingStateComponent],  template: `
    <div class="container mx-auto px-4 py-8">      <div class="mb-8 flex justify-between items-center">
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
      </div>

      <!-- Analytics Controls -->
      <div class="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div class="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div class="flex flex-col sm:flex-row gap-4">
            <!-- Sort Options -->
            <div class="flex items-center space-x-2">
              <label class="text-sm font-medium text-gray-700">Ordenar por:</label>              <select 
                [value]="sortBy()"
                (change)="onSortChange($event)"
                class="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="default">Predeterminado</option>
                <option value="popularity">Popularidad</option>
                <option value="congestion">Nivel de Congestión</option>
                <option value="alphabetic">Alfabético</option>
              </select>
            </div>

            <!-- Filter Options -->
            <div class="flex items-center space-x-2">
              <label class="text-sm font-medium text-gray-700">Filtrar por:</label>
              <select 
                [value]="filterBy()"
                (change)="onFilterChange($event)"
                class="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="all">Todos</option>
                <option value="critical">Críticos</option>
                <option value="warning">En Advertencia</option>
                <option value="stable">Estables</option>
              </select>
            </div>
          </div>

          <!-- Analytics Summary -->
          @if (analyticsEnabled()) {
            <div class="flex items-center space-x-4 text-sm text-gray-600">
              <div class="flex items-center space-x-1">
                <div class="w-3 h-3 bg-red-500 rounded-full"></div>
                <span>{{ criticalProductsCount() }} Críticos</span>
              </div>
              <div class="flex items-center space-x-1">
                <div class="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span>{{ warningProductsCount() }} En Advertencia</span>
              </div>
              <div class="flex items-center space-x-1">
                <div class="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>{{ stableProductsCount() }} Estables</span>
              </div>
            </div>
          }
        </div>
      </div><!-- Estados de carga y error usando @if -->
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
export class ProductListComponent implements OnInit, OnDestroy {  private readonly productService = inject(ProductsService);
  private readonly visualService = inject(VisualRepresentationService);
  private readonly router = inject(Router);  private readonly loadingState = inject(LoadingStateService);
  private readonly notificationState = inject(NotificationStateService);
  private readonly logger = inject(LoggerService);
  private readonly analyticsService = inject(AnalyticsService);
  private readonly authService = inject(AuthService);

  // Subject para manejo de suscripciones
  private readonly destroy$ = new Subject<void>();
  private readonly pageChange$ = new Subject<number>();

  // Signals para el estado del componente
  private readonly _products = signal<Product[]>([]);
  private readonly _productsWithImages = signal<ProductWithImage[]>([]);
  private readonly _productAnalytics = signal<Map<string, ProductAnalytics>>(new Map());
  private readonly _currentPage = signal(1);
  private readonly _totalItems = signal(0);
  private readonly _totalPages = signal(0);
  private readonly _hasMore = signal(false);
  private readonly _hasError = signal(false);
  private readonly _sortBy = signal<'default' | 'popularity' | 'congestion' | 'alphabetic'>('default');
  private readonly _filterBy = signal<'all' | 'critical' | 'stable' | 'warning'>('all');

  // Signals computadas públicas
  public readonly productsWithImages = computed(() => this._productsWithImages());
  public readonly isLoading = computed(() => this.loadingState.isLoadingOperation('loadProducts'));
  public readonly hasError = computed(() => this._hasError());
  public readonly sortBy = computed(() => this._sortBy());
  public readonly filterBy = computed(() => this._filterBy());
  
  // Analytics computed signals
  public readonly analyticsEnabled = computed(() => this._productAnalytics().size > 0);
  public readonly criticalProductsCount = computed(() => {
    return Array.from(this._productAnalytics().values())
      .filter(analytics => analytics.congestionStatus === 'CRITICO').length;
  });
  public readonly warningProductsCount = computed(() => {
    return Array.from(this._productAnalytics().values())
      .filter(analytics => analytics.congestionStatus === 'ADVERTENCIA').length;
  });
  public readonly stableProductsCount = computed(() => {
    return Array.from(this._productAnalytics().values())
      .filter(analytics => analytics.congestionStatus === 'ESTABLE').length;
  });
  
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
    this.loadProductAnalytics(); // Agregar carga de analytics
    this.notificationState.success('Productos actualizados desde el servidor');
  }  /**
   * Carga los productos (versión síncrona para uso interno)
   */
  private loadProducts(): void {
    this.loadProductsObservable()
      .pipe(takeUntil(this.destroy$))      .subscribe({
        next: () => {
          this.logger.info('Productos cargados exitosamente desde loadProducts');
          // Cargar analytics después de cargar productos
          this.loadProductAnalytics();
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
    
    // ✅ TRACKING AUTOMÁTICO: Registrar click en producto desde la lista
    // Esto cuenta como demanda/interés del usuario según la fundamentación teórica (λ = clicks/día)
    this.trackProductClick(product.id);
    
    this.router.navigate(['/home/products', product.id, 'detail']);
  }/**
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

  /**
   * Maneja el cambio de ordenamiento
   */
  onSortChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const sortBy = select.value as 'default' | 'popularity' | 'congestion' | 'alphabetic';
    this._sortBy.set(sortBy);
    this.applySortingAndFiltering();
  }

  /**
   * Maneja el cambio de filtros
   */
  onFilterChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const filterBy = select.value as 'all' | 'critical' | 'stable' | 'warning';
    this._filterBy.set(filterBy);
    this.applySortingAndFiltering();
  }
  /**
   * Actualiza el listado con filtros aplicados - agregando carga de analytics
   */
  private refreshProductsWithAnalytics(): void {
    this._currentPage.set(1);
    this.loadProducts();
    this.loadProductAnalytics();
  }

  /**
   * Aplica ordenamiento y filtrado a los productos
   */
  private applySortingAndFiltering(): void {
    const products = this._productsWithImages();
    const analytics = this._productAnalytics();
    let sortedProducts = [...products];

    // Aplicar filtros
    if (this._filterBy() !== 'all') {
      sortedProducts = sortedProducts.filter(product => {
        const productAnalytics = analytics.get(product.id);
        if (!productAnalytics) return this._filterBy() === 'all';
        
        switch (this._filterBy()) {
          case 'critical':
            return productAnalytics.congestionStatus === 'CRITICO';
          case 'warning':
            return productAnalytics.congestionStatus === 'ADVERTENCIA';
          case 'stable':
            return productAnalytics.congestionStatus === 'ESTABLE';
          default:
            return true;
        }
      });
    }

    // Aplicar ordenamiento
    switch (this._sortBy()) {
      case 'popularity':
        sortedProducts.sort((a, b) => {
          const aAnalytics = analytics.get(a.id);
          const bAnalytics = analytics.get(b.id);
          const aClicks = aAnalytics?.totalClicks || 0;
          const bClicks = bAnalytics?.totalClicks || 0;
          return bClicks - aClicks;
        });
        break;
      case 'congestion':
        sortedProducts.sort((a, b) => {
          const aAnalytics = analytics.get(a.id);
          const bAnalytics = analytics.get(b.id);
          const aUtil = aAnalytics?.utilizationFactor || 0;
          const bUtil = bAnalytics?.utilizationFactor || 0;
          return bUtil - aUtil;
        });
        break;
      case 'alphabetic':
        sortedProducts.sort((a, b) => a.title.localeCompare(b.title));
        break;
      default:
        // Mantener orden original
        break;
    }

    // Enriquecer productos con analytics antes de establecer
    const enrichedSortedProducts: ProductWithImage[] = sortedProducts.map(product => ({
      ...product,
      analytics: analytics.get(product.id) ? {
        totalClicks: analytics.get(product.id)!.totalClicks,
        congestionStatus: analytics.get(product.id)!.congestionStatus,
        utilizationFactor: analytics.get(product.id)!.utilizationFactor,
        arrivalRate: analytics.get(product.id)!.arrivalRate
      } : undefined
    }));

    this._productsWithImages.set(enrichedSortedProducts);
  }  /**
   * Carga analytics para los productos actuales (solo si está autenticado)
   */
  private loadProductAnalytics(): void {
    // ✅ Solo cargar analytics si el usuario está autenticado
    if (!this.authService.isAuthenticated()) {
      this.logger.debug('Skipping analytics load - user not authenticated', {}, 'ProductListComponent.loadProductAnalytics');
      return;
    }

    const products = this._products();
    if (products.length === 0) return;

    const productIds = products.map(p => p.id);
    
    // Cargar analytics de todos los productos en paralelo
    const analyticsRequests = productIds.map(id => 
      this.analyticsService.getProductStats(id).pipe(
        map(stats => stats.analytics), // Extraer solo el ProductAnalytics
        catchError(error => {
          this.logger.warn('Error loading analytics for product', { productId: id, error });
          return of(null);
        })
      )
    );

    forkJoin(analyticsRequests).pipe(
      takeUntil(this.destroy$)
    ).subscribe(analyticsArray => {
      const analyticsMap = new Map<string, ProductAnalytics>();
      
      analyticsArray.forEach((analytics, index) => {
        if (analytics) {
          analyticsMap.set(productIds[index], analytics);
        }
      });this._productAnalytics.set(analyticsMap);
      this.enrichProductsWithAnalytics();
      this.applySortingAndFiltering();
    });
  }
  /**
   * Enriquece los productos con datos de analytics
   */
  private enrichProductsWithAnalytics(): void {
    const products = this._productsWithImages();
    const analytics = this._productAnalytics();
    
    const enrichedProducts: ProductWithImage[] = products.map(product => ({
      ...product,
      analytics: analytics.get(product.id) ? {
        totalClicks: analytics.get(product.id)!.totalClicks,
        congestionStatus: analytics.get(product.id)!.congestionStatus,
        utilizationFactor: analytics.get(product.id)!.utilizationFactor,
        arrivalRate: analytics.get(product.id)!.arrivalRate
      } : undefined
    }));

    this._productsWithImages.set(enrichedProducts);
  }

  /**
   * ✅ MÉTODO DE TRACKING: Registra clicks en productos desde la lista
   * Implementa la fundamentación teórica: λ = clicks/día
   */
  private trackProductClick(productId: string): void {
    const trackingData = {
      productId,
      interactionType: 'CLICK' as const,
      duration: 1,
      userAgent: navigator.userAgent,
      referrer: document.referrer || undefined
    };

    console.log('🎯 Analytics: Tracking click from product list', {
      productId,
      trackingData
    });
    
    this.analyticsService.trackProductInteraction(trackingData).subscribe({
      next: (result) => {
        console.log(`✅ Analytics: Click tracked successfully for product ${productId}`, result);
      },
      error: (error) => {
        console.error('❌ Analytics tracking failed from product list:', {
          error: error.message,
          productId
        });
      }
    });
  }
}
