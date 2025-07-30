import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, tap, map, finalize, of, EMPTY, switchMap } from 'rxjs';
import { Product, CreateProduct, UpdateProduct } from '../interfaces/product.interface';
import { TokenService } from '../../../auth/services/token.service';
import { AuthService } from '../../../auth/services/auth.service';
import { environment } from '@environments/environments';
import { API_ROUTES } from '../../../core/constants';
import { LoggerService } from '../../../core/services';
import { LoadingStateService } from '../../../core/services/loading-state.service';
import { NotificationStateService } from '../../../core/services/notification-state.service';
import { HttpCacheService } from '../../../core/services/http-cache.service';
import { AnalyticsService } from '../../../core/services/analytics.service';

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}


@Injectable({
  providedIn: 'root'
})
export class ProductsService {
  private http = inject(HttpClient);
  private readonly tokenService = inject(TokenService);
  private readonly authService = inject(AuthService);
  private readonly logger = inject(LoggerService);
  private readonly loadingState = inject(LoadingStateService);
  private readonly notificationState = inject(NotificationStateService);
  private readonly cacheService = inject(HttpCacheService);
  private readonly analyticsService = inject(AnalyticsService);
  private readonly baseUrl: string = environment.baseUrl;
  public findAllProducts(limit = 10, offset = 0): Observable<PaginatedResponse<Product>> {
    const cacheKey = `products_${limit}_${offset}`;

    const cachedData = this.cacheService.get<PaginatedResponse<Product>>(cacheKey);
    if (cachedData) {
      this.logger.debug('Productos obtenidos del caché', {
        cacheKey,
        count: cachedData.data.length
      }, 'ProductsService.findAllProducts');
      return of(cachedData);
    }

    const params = new HttpParams()
      .set('limit', limit.toString())
      .set('offset', offset.toString()); return this.http.get<Product[]>(`${this.baseUrl}${API_ROUTES.CONSUMER_PRODUCTS}`, { params }).pipe(
        tap(products => {
          this.logger.debug('Productos recibidos del backend', {
            count: products.length,
            limit,
            offset
          }, 'ProductsService.findAllProducts');

          const hasMore = products.length === limit;
          this.logger.debug('Información de paginación', { hasMore }, 'ProductsService.findAllProducts');
        }),
        map((products: Product[]) => {
          const hasMore = products.length === limit;
          const response: PaginatedResponse<Product> = {
            data: products,
            total: hasMore ? (offset + limit + 1) : (offset + products.length),
            limit,
            offset,
            hasMore
          };

          this.cacheService.set(cacheKey, response, { ttl: 2 * 60 * 1000 });

          return response;
        })
      );
  } public findVendorProducts(limit = 10, offset = 0): Observable<PaginatedResponse<Product>> {
    if (!this.authService.isAuthenticated()) {
      return of({
        data: [],
        total: 0,
        limit,
        offset,
        hasMore: false
      } as PaginatedResponse<Product>);
    }

    const token = this.tokenService.getToken();
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    const url = `${this.baseUrl}${API_ROUTES.FIND_VENDOR_PRODUCTS}`;

    const params = new HttpParams()
      .set('limit', limit.toString())
      .set('offset', offset.toString()); return this.http.get<Product[]>(url, { params, headers }).pipe(
        tap(products => {
          this.logger.debug('Productos del vendor recibidos del backend', {
            count: products.length
          }, 'ProductsService.findVendorProducts');
        }),
        map((products: Product[]) => {
          const hasMore = products.length === limit;
          const estimatedTotal = hasMore ? (offset + limit + 1) : (offset + products.length);

          return {
            data: products,
            total: estimatedTotal,
            limit: limit,
            offset: offset,
            hasMore: hasMore
          } as PaginatedResponse<Product>;
        })
      );
  }

  public getVendorProduct(id: string): Observable<Product> {
    const url = `${this.baseUrl}${API_ROUTES.GET_VENDOR_PRODUCT}/${id}`;

    return this.http.get<Product>(url);
  } public createProduct(createProduct: CreateProduct): Observable<Product> {
    const loadingKey = 'createProduct';
    this.loadingState.startLoading(loadingKey, 'Creando producto...');
    this.logger.info('Iniciando creación de producto', { productTitle: createProduct.title }, 'ProductsService.createProduct');

    const token = this.tokenService.getToken();
    this.logger.debug('Token de autenticación obtenido', { hasToken: !!token }, 'ProductsService.createProduct');

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    const url = `${this.baseUrl}${API_ROUTES.CREATE_VENDOR_PRODUCTS}`;
    this.logger.debug('Enviando petición de creación', { url }, 'ProductsService.createProduct');

    return this.http.post<Product>(url, createProduct, { headers }).pipe(
      tap({
        next: (response) => {
          this.logger.info('Producto creado exitosamente', {
            productId: response.id,
            productTitle: response.title
          }, 'ProductsService.createProduct');
          this.notificationState.success(`Producto "${response.title}" creado exitosamente`);
        },
        error: (error) => {
          this.logger.error('Error al crear producto', {
            status: error.status,
            message: error.message,
            details: error.error
          }, 'ProductsService.createProduct');
          this.notificationState.error('Error al crear el producto. Inténtalo de nuevo.');
        }
      }),
      finalize(() => this.loadingState.stopLoading(loadingKey))
    );
  } public updateProduct(productId: string, body: UpdateProduct): Observable<Product> {
    const token = this.tokenService.getToken();
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    const url = `${this.baseUrl}${API_ROUTES.UPDATE_VENDOR_PRODUCT}/${productId}`;

    return this.http.patch<Product>(url, body, { headers }).pipe(
      tap((updatedProduct) => {
        if (body.stock !== undefined) {
          this.trackProductManagement(productId, 'Stock updated');
        }

        this.invalidateProductCache(productId);
      })
    );
  }

  /**
   * MÉTODO DE TRACKING: Registra actividad de gestión de productos
   * Esto genera actividad que puede ser interpretada como demanda
   */
  private trackProductManagement(productId: string, action: string): void {
    const trackingData = {
      productId,
      interactionType: 'CLICK' as const,
      duration: 1,
      userAgent: navigator.userAgent,
      referrer: document.referrer || undefined
    }; this.analyticsService.trackProductInteraction(trackingData).subscribe({
      next: (result) => {
        // Analytics successfully tracked
      },
      error: (error) => {
        // Silent fail for analytics tracking
      }
    });
  }

  /**
   * Invalida caché relacionado con un producto
   */
  private invalidateProductCache(productId: string): void {
    this.cacheService.invalidatePattern(`product_${productId}`);
    this.cacheService.invalidatePattern('products_');
    this.cacheService.invalidatePattern('vendor_products_');
  } public deleteProduct(productId: string): Observable<void> {
    const loadingKey = `deleteProduct_${productId}`;
    this.loadingState.startLoading(loadingKey, 'Eliminando producto...');
    this.logger.info('Iniciando eliminación de producto', { productId }, 'ProductsService.deleteProduct');

    const token = this.tokenService.getToken();
    this.logger.debug('Token de autenticación obtenido', { hasToken: !!token }, 'ProductsService.deleteProduct');

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    const url = `${this.baseUrl}${API_ROUTES.DELETE_VENDOR_PRODUCT}/${productId}`;
    this.logger.debug('URL de eliminación configurada', { url }, 'ProductsService.deleteProduct');

    return this.http.delete<void>(url, { headers }).pipe(
      tap({
        next: () => {
          this.logger.info('Producto eliminado exitosamente', { productId }, 'ProductsService.deleteProduct');
          this.notificationState.success('Producto eliminado exitosamente');
        },
        error: (error) => {
          this.logger.error('Error al eliminar producto', {
            productId,
            status: error.status,
            message: error.message,
            details: error.error
          }, 'ProductsService.deleteProduct');
          this.notificationState.error('Error al eliminar el producto. Inténtalo de nuevo.');
        }
      }),
      finalize(() => this.loadingState.stopLoading(loadingKey))
    );
  }

  public getProductDetail(id: string): Observable<Product> {
    const url = `${this.baseUrl}${API_ROUTES.GET_PRODUCT_DETAIL}/${id}`;

    return this.http.get<Product>(url);
  }

}
