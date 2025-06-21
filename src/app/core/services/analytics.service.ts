import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of, catchError, map, tap, throwError } from 'rxjs';
import { 
  ClickTrackingDto, 
  StockUpdateDto, 
  QueueMetrics, 
  ProductStats, 
  VendorDashboard, 
  PriorityProduct,
  QueueTheoryDemo,
  ProductAnalytics,
  ClickTracking,
  StockHistory
} from '../types/analytics.interface';
import { environment } from '@environments/environments';
import { API_ROUTES } from '../constants';
import { LoggerService } from './logger.service';
import { HttpCacheService } from './http-cache.service';
import { TokenService } from '../../auth/services/token.service';
import { AuthService } from '../../auth/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private readonly http = inject(HttpClient);
  private readonly logger = inject(LoggerService);
  private readonly cacheService = inject(HttpCacheService);
  private readonly tokenService = inject(TokenService);
  private readonly authService = inject(AuthService);
  
  private readonly baseUrl: string = environment.baseUrl;

  /**
   * Registra un click o interacción en un producto
   * FASE 2: Tracking automático de clicks
   */  trackProductInteraction(trackingData: ClickTrackingDto): Observable<ClickTracking> {
    const url = `${this.baseUrl}${API_ROUTES.ANALYTICS_TRACK_CLICK}`;
    
    // Enriquecer datos automáticamente
    const enrichedData: ClickTrackingDto = {
      ...trackingData,
      userAgent: trackingData.userAgent || navigator.userAgent,
      referrer: trackingData.referrer || document.referrer,
      interactionType: trackingData.interactionType || 'CLICK'
    };

    this.logger.info('🎯 TRACKING PRODUCT INTERACTION', {
      url,
      productId: enrichedData.productId,
      interactionType: enrichedData.interactionType,
      enrichedData
    }, 'AnalyticsService.trackProductInteraction');

    return this.http.post<ClickTracking>(url, enrichedData).pipe(
      tap((result) => {
        this.logger.info('✅ PRODUCT INTERACTION TRACKED SUCCESSFULLY', {
          productId: enrichedData.productId,
          result
        }, 'AnalyticsService.trackProductInteraction');
        
        // Invalidar caché relacionado
        this.invalidateProductCache(trackingData.productId);
      }),
      catchError(error => {
        this.logger.error('❌ ERROR TRACKING PRODUCT INTERACTION', {
          error: error.message,
          status: error.status,
          url,
          productId: enrichedData.productId,
          errorDetails: error
        }, 'AnalyticsService.trackProductInteraction');
        
        // Retornar un objeto mock en caso de error para no romper la UX
        return of({
          id: 'mock-' + Date.now(),
          productId: enrichedData.productId,
          interactionType: enrichedData.interactionType || 'CLICK',
          duration: enrichedData.duration || 1,
          createdAt: new Date()
        } as ClickTracking);
      })
    );
  }

  /**
   * Registra cambios en el stock (solo para vendedores autenticados)
   */
  trackStockChange(stockData: StockUpdateDto): Observable<StockHistory> {
    if (!this.authService.isAuthenticated()) {
      return of({} as StockHistory);
    }

    const url = `${this.baseUrl}${API_ROUTES.ANALYTICS_TRACK_STOCK}`;
    const headers = this.getAuthHeaders();

    return this.http.post<StockHistory>(url, stockData, { headers }).pipe(
      tap(() => {
        this.logger.debug('Stock change tracked successfully', {
          productId: stockData.productId,
          changeType: stockData.changeType
        }, 'AnalyticsService.trackStockChange');
        
        this.invalidateProductCache(stockData.productId);
        this.invalidateVendorCache();
      }),
      catchError(error => {
        this.logger.error('Error tracking stock change', {
          error: error.message,
          productId: stockData.productId
        }, 'AnalyticsService.trackStockChange');
        throw error;
      })
    );
  }

  /**
   * Obtiene estadísticas completas de un producto
   */
  getProductStats(productId: string): Observable<ProductStats> {
    const cacheKey = `product_stats_${productId}`;
    const cached = this.cacheService.get<ProductStats>(cacheKey);
    
    if (cached) {
      this.logger.debug('Product stats retrieved from cache', { productId }, 'AnalyticsService.getProductStats');
      return of(cached);
    }

    const url = `${this.baseUrl}${API_ROUTES.ANALYTICS_PRODUCT_STATS}/${productId}/stats`;

    return this.http.get<ProductStats>(url).pipe(
      tap(stats => {
        this.logger.debug('Product stats retrieved from backend', {
          productId,
          congestionStatus: stats.queueMetrics?.status
        }, 'AnalyticsService.getProductStats');
        
        // Caché de 5 minutos para estadísticas
        this.cacheService.set(cacheKey, stats, { ttl: 5 * 60 * 1000 });
      }),
      catchError(error => {
        this.logger.error('Error getting product stats', {
          error: error.message,
          productId
        }, 'AnalyticsService.getProductStats');
        return of({} as ProductStats);
      })
    );
  }

  /**
   * Obtiene métricas de teoría de colas para un producto
   */
  getQueueMetrics(productId: string, period: number = 30): Observable<QueueMetrics> {
    const cacheKey = `queue_metrics_${productId}_${period}`;
    const cached = this.cacheService.get<QueueMetrics>(cacheKey);
    
    if (cached) {
      return of(cached);
    }

    const url = `${this.baseUrl}${API_ROUTES.ANALYTICS_QUEUE_METRICS}/${productId}/queue-metrics`;
    const params = new HttpParams().set('period', period.toString());

    return this.http.get<QueueMetrics>(url, { params }).pipe(
      tap(metrics => {
        this.logger.debug('Queue metrics retrieved', {
          productId,
          rho: metrics.rho,
          status: metrics.status
        }, 'AnalyticsService.getQueueMetrics');
        
        // Caché de 10 minutos para métricas de cola
        this.cacheService.set(cacheKey, metrics, { ttl: 10 * 60 * 1000 });
      }),
      catchError(error => {
        this.logger.error('Error getting queue metrics', {
          error: error.message,
          productId
        }, 'AnalyticsService.getQueueMetrics');
        
        // Retornar métricas por defecto
        return of({
          lambda: 0,
          mu: 0,
          rho: 0,
          status: 'ESTABLE',
          message: 'No hay datos suficientes para calcular métricas'
        } as QueueMetrics);
      })
    );
  }

  /**
   * Obtiene el historial de clicks de un producto
   */
  getClickHistory(productId: string, limit: number = 100): Observable<ClickTracking[]> {
    const cacheKey = `click_history_${productId}_${limit}`;
    const cached = this.cacheService.get<ClickTracking[]>(cacheKey);
    
    if (cached) {
      this.logger.debug('Click history retrieved from cache', { productId, limit }, 'AnalyticsService.getClickHistory');
      return of(cached);
    }

    const url = `${this.baseUrl}${API_ROUTES.ANALYTICS_PRODUCT_STATS}/${productId}/click-history?limit=${limit}`;

    return this.http.get<ClickTracking[]>(url).pipe(
      tap(history => {
        this.logger.debug('Click history retrieved from backend', {
          productId,
          recordCount: history.length
        }, 'AnalyticsService.getClickHistory');
        
        // Caché de 10 minutos para históricos
        this.cacheService.set(cacheKey, history, { ttl: 10 * 60 * 1000 });
      }),
      catchError(error => {
        this.logger.error('Error getting click history', {
          error: error.message,
          productId
        }, 'AnalyticsService.getClickHistory');
        return of([]);
      })
    );
  }

  /**
   * Obtiene el historial de stock de un producto
   */
  getStockHistory(productId: string, limit: number = 50): Observable<StockHistory[]> {
    const cacheKey = `stock_history_${productId}_${limit}`;
    const cached = this.cacheService.get<StockHistory[]>(cacheKey);
    
    if (cached) {
      this.logger.debug('Stock history retrieved from cache', { productId, limit }, 'AnalyticsService.getStockHistory');
      return of(cached);
    }

    const url = `${this.baseUrl}${API_ROUTES.ANALYTICS_PRODUCT_STATS}/${productId}/stock-history?limit=${limit}`;

    return this.http.get<StockHistory[]>(url).pipe(
      tap(history => {
        this.logger.debug('Stock history retrieved from backend', {
          productId,
          recordCount: history.length
        }, 'AnalyticsService.getStockHistory');
        
        // Caché de 10 minutos para históricos
        this.cacheService.set(cacheKey, history, { ttl: 10 * 60 * 1000 });
      }),
      catchError(error => {
        this.logger.error('Error getting stock history', {
          error: error.message,
          productId
        }, 'AnalyticsService.getStockHistory');
        return of([]);
      })
    );
  }

  /**
   * Obtiene productos prioritarios basados en teoría de colas
   */
  getPriorityProducts(limit: number = 10): Observable<PriorityProduct[]> {
    const cacheKey = `priority_products_${limit}`;
    const cached = this.cacheService.get<PriorityProduct[]>(cacheKey);
    
    if (cached) {
      return of(cached);
    }

    const url = `${this.baseUrl}${API_ROUTES.ANALYTICS_PRIORITY_PRODUCTS}`;
    const params = new HttpParams().set('limit', limit.toString());

    return this.http.get<PriorityProduct[]>(url, { params }).pipe(
      tap(products => {
        this.logger.debug('Priority products retrieved', {
          count: products.length
        }, 'AnalyticsService.getPriorityProducts');
          // Caché de 2 minutos para mayor responsividad
        this.cacheService.set(cacheKey, products, { ttl: 2 * 60 * 1000 });
      }),
      catchError(error => {
        this.logger.error('Error getting priority products', {
          error: error.message
        }, 'AnalyticsService.getPriorityProducts');
        return of([]);
      })
    );
  }

  /**
   * Obtiene productos críticos que necesitan atención inmediata
   */
  getCriticalProducts(): Observable<PriorityProduct[]> {
    const cacheKey = 'critical_products';
    const cached = this.cacheService.get<PriorityProduct[]>(cacheKey);
    
    if (cached) {
      return of(cached);
    }

    const url = `${this.baseUrl}${API_ROUTES.ANALYTICS_CRITICAL_PRODUCTS}`;

    return this.http.get<PriorityProduct[]>(url).pipe(
      tap(products => {
        this.logger.debug('Critical products retrieved', {
          count: products.length
        }, 'AnalyticsService.getCriticalProducts');
        
        // Caché de 2 minutos para productos críticos
        this.cacheService.set(cacheKey, products, { ttl: 2 * 60 * 1000 });
      }),
      catchError(error => {
        this.logger.error('Error getting critical products', {
          error: error.message
        }, 'AnalyticsService.getCriticalProducts');
        return of([]);
      })
    );
  }
  /**
   * Obtiene el dashboard del vendedor (requiere autenticación)
   */
  getVendorDashboard(): Observable<VendorDashboard> {
    if (!this.authService.isAuthenticated()) {
      this.logger.warn('User not authenticated for vendor dashboard', {}, 'AnalyticsService.getVendorDashboard');
      return of({} as VendorDashboard);
    }

    const cacheKey = 'vendor_dashboard';
    const cached = this.cacheService.get<VendorDashboard>(cacheKey);
    
    if (cached) {
      this.logger.debug('Returning cached vendor dashboard', {
        totalProducts: cached.totalProducts,
        totalInteractions: cached.totalInteractions,
        cached: true
      }, 'AnalyticsService.getVendorDashboard');
      return of(cached);
    }

    const url = `${this.baseUrl}${API_ROUTES.ANALYTICS_VENDOR_DASHBOARD}`;
    const headers = this.getAuthHeaders();

    this.logger.info('🔄 FETCHING VENDOR DASHBOARD FROM SERVER', {
      url,
      userId: this.authService.currentUser()?.id
    }, 'AnalyticsService.getVendorDashboard');

    return this.http.get<VendorDashboard>(url, { headers }).pipe(
      tap(dashboard => {        this.logger.info('📊 VENDOR DASHBOARD RETRIEVED', {
          totalProducts: dashboard.totalProducts,
          totalInteractions: dashboard.totalInteractions,
          criticalProducts: dashboard.criticalProducts,
          averageUtilization: dashboard.averageUtilization,
          dashboard
        }, 'AnalyticsService.getVendorDashboard');
          // Caché de 2 minutos para dashboard
        this.cacheService.set(cacheKey, dashboard, { ttl: 2 * 60 * 1000 });
      }),
      catchError(error => {
        this.logger.error('❌ ERROR GETTING VENDOR DASHBOARD', {
          error: error.message,
          status: error.status,
          url
        }, 'AnalyticsService.getVendorDashboard');
        return of({} as VendorDashboard);
      })
    );
  }

  /**
   * Fuerza el recálculo de todas las métricas (solo vendedores)
   */
  recalculateMetrics(): Observable<{ message: string }> {
    if (!this.authService.isAuthenticated()) {
      return of({ message: 'No autorizado' });
    }

    const url = `${this.baseUrl}${API_ROUTES.ANALYTICS_RECALCULATE_METRICS}`;
    const headers = this.getAuthHeaders();

    return this.http.post<{ message: string }>(url, {}, { headers }).pipe(
      tap(() => {
        this.logger.debug('Metrics recalculated successfully', {}, 'AnalyticsService.recalculateMetrics');
        
        // Limpiar todo el caché de analytics
        this.clearAnalyticsCache();
      }),
      catchError(error => {
        this.logger.error('Error recalculating metrics', {
          error: error.message
        }, 'AnalyticsService.recalculateMetrics');
        throw error;
      })
    );
  }
  /**
   * Obtiene demo educativa de teoría de colas para un producto
   */
  getQueueTheoryDemo(productId: string): Observable<QueueTheoryDemo> {
    // Usar el endpoint de métricas existente en lugar del demo
    const url = `${this.baseUrl}${API_ROUTES.ANALYTICS_QUEUE_METRICS}/${productId}/queue-metrics`;

    return this.http.get<QueueTheoryDemo>(url).pipe(
      catchError(error => {
        this.logger.error('Error getting queue theory demo', {
          error: error.message,
          productId
        }, 'AnalyticsService.getQueueTheoryDemo');
        throw error;
      })
    );
  }

  /**
   * ✅ MÉTODO PARA DEBUGGING - Fuerza recálculo de métricas de todos los productos
   */
  forceRecalculateAllMetrics(): Observable<any> {
    if (!this.authService.isAuthenticated()) {
      return of({ error: 'User not authenticated' });
    }

    const url = `${this.baseUrl}${API_ROUTES.ANALYTICS_RECALCULATE_METRICS}`;
    const headers = this.getAuthHeaders();

    this.logger.info('🔄 FORCING METRICS RECALCULATION', { url }, 'AnalyticsService.forceRecalculateAllMetrics');

    return this.http.post<any>(url, {}, { headers }).pipe(
      tap((result) => {
        this.logger.info('✅ METRICS RECALCULATION COMPLETED', { result }, 'AnalyticsService.forceRecalculateAllMetrics');
        
        // Limpiar caché para forzar refetch
        this.cacheService.clear();
      }),
      catchError(error => {
        this.logger.error('❌ ERROR IN METRICS RECALCULATION', {
          error: error.message,
          status: error.status
        }, 'AnalyticsService.forceRecalculateAllMetrics');
        return of({ error: error.message });
      })
    );
  }

  /**
   * ✅ MÉTODO PARA DEBUGGING - Fuerza recálculo de métricas de un producto específico
   */
  forceRecalculateProductMetrics(productId: string): Observable<any> {
    if (!this.authService.isAuthenticated()) {
      return of({ error: 'User not authenticated' });
    }

    const url = `${this.baseUrl}/analytics/recalculate-product-metrics/${productId}`;
    const headers = this.getAuthHeaders();

    this.logger.info('🔄 FORCING PRODUCT METRICS RECALCULATION', { productId, url }, 'AnalyticsService.forceRecalculateProductMetrics');

    return this.http.post<any>(url, {}, { headers }).pipe(
      tap((result) => {
        this.logger.info('✅ PRODUCT METRICS RECALCULATION COMPLETED', { 
          productId,
          result 
        }, 'AnalyticsService.forceRecalculateProductMetrics');
        
        // Invalidar caché del producto específico
        this.invalidateProductCache(productId);
      }),
      catchError(error => {
        this.logger.error('❌ ERROR IN PRODUCT METRICS RECALCULATION', {
          error: error.message,
          status: error.status,
          productId
        }, 'AnalyticsService.forceRecalculateProductMetrics');
        return of({ error: error.message });
      })
    );
  }

  /**
   * ✅ MÉTODO PARA DEBUGGING - Limpia el caché del dashboard
   */
  clearDashboardCache(): void {
    this.logger.info('🧹 CLEARING DASHBOARD CACHE', {}, 'AnalyticsService.clearDashboardCache');    this.cacheService.clear();
  }

  /**
   * ✅ NUEVO: Inicializa productos sin historial de analytics
   */
  initializeProductsWithoutHistory(): Observable<any> {
    if (!this.authService.isAuthenticated()) {
      return throwError(() => new Error('Usuario no autenticado'));
    }

    const url = `${this.baseUrl}${API_ROUTES.ANALYTICS_INITIALIZE_PRODUCTS}`;
    const headers = this.getAuthHeaders();

    this.logger.info('Iniciando inicialización de productos sin historial', {}, 'AnalyticsService.initializeProductsWithoutHistory');

    return this.http.post<any>(url, {}, { headers }).pipe(
      tap((response) => {
        this.logger.info('Productos inicializados exitosamente', {
          response
        }, 'AnalyticsService.initializeProductsWithoutHistory');
        
        // Limpiar caché después de la inicialización
        this.clearAnalyticsCache();
      }),
      catchError((error) => {
        this.logger.error('Error al inicializar productos', {
          error: error.message
        }, 'AnalyticsService.initializeProductsWithoutHistory');
        return throwError(() => error);
      })
    );
  }

  // Métodos privados de utilidad

  private getAuthHeaders(): HttpHeaders {
    const token = this.tokenService.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }
  private invalidateProductCache(productId: string): void {
    this.cacheService.delete(`product_stats_${productId}`);
    this.cacheService.delete(`queue_metrics_${productId}_30`);
    this.logger.debug('Product cache invalidated', { productId }, 'AnalyticsService.invalidateProductCache');
  }

  private invalidateVendorCache(): void {
    this.cacheService.delete('vendor_dashboard');
    this.cacheService.delete('priority_products_10');
    this.cacheService.delete('critical_products');
    this.logger.debug('Vendor cache invalidated', {}, 'AnalyticsService.invalidateVendorCache');
  }
  private clearAnalyticsCache(): void {
    // Limpiar todo el caché relacionado con analytics
    this.cacheService.invalidatePattern(/^product_stats_/);
    this.cacheService.invalidatePattern(/^queue_metrics_/);
    this.cacheService.invalidatePattern(/^priority_products_/);
    this.cacheService.delete('critical_products');
    this.cacheService.delete('vendor_dashboard');
    
    this.logger.debug('All analytics cache cleared', {}, 'AnalyticsService.clearAnalyticsCache');
  }
}
