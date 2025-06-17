import { Injectable, inject } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap, delay } from 'rxjs/operators';
import { AnalyticsService } from '../services/analytics.service';
import { LoggerService } from '../services/logger.service';
import { API_ROUTES } from '../constants';

/**
 * Interceptor para tracking automático de visualizaciones de productos
 * Se ejecuta cuando se accede a endpoints de detalles de productos
 */
@Injectable()
export class AnalyticsTrackingInterceptor implements HttpInterceptor {
  private readonly analyticsService = inject(AnalyticsService);
  private readonly logger = inject(LoggerService);
  // Cache para evitar tracking duplicado en poco tiempo
  private recentlyTracked = new Map<string, number>();
  private readonly TRACKING_COOLDOWN = 5000; // 5 segundos de cooldown más estricto
  
  // Contador para rastrear requests únicas
  private requestCounter = 0;
  
  // Seguimiento por sesión para evitar múltiples vistas del mismo producto
  // ✅ CAMBIO: Usar timestamp en lugar de boolean para permitir revisitas después de tiempo
  private sessionTracked = new Map<string, number>();
  private readonly SESSION_REVISIT_COOLDOWN = 30000; // 30 segundos para permitir revisitas
  
  // Cache global para evitar tracking desde múltiples fuentes
  private static globalTrackingCache = new Map<string, number>();
  private static readonly GLOBAL_COOLDOWN = 3000; // 3 segundos globales

  // Endpoints que deben generar tracking automático
  private readonly trackingEndpoints = [
    `${API_ROUTES.GET_PRODUCT_DETAIL}/`, // GET /products/{id}
  ];  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // 🔍 DEBUGGING: Registrar TODAS las solicitudes HTTP
    if (req.method === 'GET') {
      this.logger.debug('📡 HTTP REQUEST DETECTED', {
        method: req.method,
        url: req.url,
        headers: Object.fromEntries(req.headers.keys().map(key => [key, req.headers.get(key)]))
      }, 'AnalyticsTrackingInterceptor.HTTP_LOG');
    }

    return next.handle(req).pipe(
      tap(event => {
        // Solo procesar respuestas exitosas de GET
        if (event instanceof HttpResponse && 
            req.method === 'GET' && 
            event.status === 200) {
          
          const shouldTrack = this.shouldTrackRequest(req.url);
          this.requestCounter++;
          
          this.logger.debug('🔍 HTTP Response Analysis', {
            requestId: this.requestCounter,
            url: req.url,
            status: event.status,
            shouldTrack: shouldTrack,
            productId: shouldTrack ? this.extractProductId(req.url) : null
          }, 'AnalyticsTrackingInterceptor');

          if (shouldTrack) {
            this.logger.info('🎯 TRACKING CANDIDATE FOUND!', {
              requestId: this.requestCounter,
              url: req.url,
              productId: this.extractProductId(req.url)
            }, 'AnalyticsTrackingInterceptor');
            this.trackProductView(req.url, event);
          }
        }
      })
    );
  }private shouldTrackRequest(url: string): boolean {
    // Solo trackear calls específicas al endpoint de detalle de producto
    // Pattern más específico: debe ser exactamente /products/{uuid} sin nada más
    const productDetailPattern = /\/products\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
    
    const shouldTrack = productDetailPattern.test(url);
    
    this.logger.debug('🔍 URL Pattern Analysis', {
      url,
      pattern: '/products/{uuid}',
      matches: shouldTrack,
      explanation: shouldTrack ? 'MATCH - Will track' : 'NO MATCH - Will skip'
    }, 'AnalyticsTrackingInterceptor.shouldTrackRequest');

    return shouldTrack;
  }
  private trackProductView(url: string, response: HttpResponse<any>): void {
    try {
      // Extraer ID del producto de la URL
      const productId = this.extractProductId(url);
      
      if (!productId) {
        this.logger.debug('Could not extract product ID from URL', { url }, 'AnalyticsTrackingInterceptor');
        return;
      }      // Verificar que la respuesta contenga un producto válido
      if (!response.body || !response.body.id) {
        this.logger.debug('Response does not contain valid product data', { url }, 'AnalyticsTrackingInterceptor');
        return;
      }

      // ✅ Obtener timestamp actual al inicio
      const now = Date.now();

      // ✅ NUEVA VERIFICACIÓN - Permitir revisitas después de cooldown de sesión
      const sessionKey = `session_${productId}`;
      const lastSessionTracked = this.sessionTracked.get(sessionKey);
      
      if (lastSessionTracked && (now - lastSessionTracked) < this.SESSION_REVISIT_COOLDOWN) {
        this.logger.debug('🚫 TRACKING SKIPPED - Recently tracked in this session', {
          requestId: this.requestCounter,
          productId,
          sessionKey,
          timeSinceSessionTrack: now - lastSessionTracked,
          sessionCooldown: this.SESSION_REVISIT_COOLDOWN
        }, 'AnalyticsTrackingInterceptor');
        return;
      }

// ✅ VERIFICAR COOLDOWN GLOBAL - Evitar tracking desde múltiples fuentes
      const globalLastTracked = AnalyticsTrackingInterceptor.globalTrackingCache.get(productId);
      
      if (globalLastTracked && (now - globalLastTracked) < AnalyticsTrackingInterceptor.GLOBAL_COOLDOWN) {
        this.logger.warn('🚨 GLOBAL DUPLICATE TRACKING PREVENTED', {
          requestId: this.requestCounter,
          productId,
          timeSinceGlobalTrack: now - globalLastTracked,
          globalCooldown: AnalyticsTrackingInterceptor.GLOBAL_COOLDOWN,
          source: 'interceptor'
        }, 'AnalyticsTrackingInterceptor');
        return;
      }

      // ✅ VERIFICAR COOLDOWN LOCAL - Evitar tracking duplicado
      const lastTracked = this.recentlyTracked.get(productId);
      
      if (lastTracked && (now - lastTracked) < this.TRACKING_COOLDOWN) {
        this.logger.warn('🚨 LOCAL DUPLICATE TRACKING PREVENTED', {
          requestId: this.requestCounter,
          productId,
          timeSinceLastTrack: now - lastTracked,
          cooldown: this.TRACKING_COOLDOWN,
          url
        }, 'AnalyticsTrackingInterceptor');
        return;
      }      // Marcar como trackeado en esta sesión (usar timestamp)
      this.sessionTracked.set(sessionKey, now);
      
      // Actualizar timestamp de último tracking (local y global)
      this.recentlyTracked.set(productId, now);
      AnalyticsTrackingInterceptor.globalTrackingCache.set(productId, now);

      // Limpiar entradas antiguas del cache (más de 1 minuto)
      this.cleanupTrackingCache();

      // Tracking automático con delay para no afectar la UX
      const trackingData = {
        productId: productId,
        interactionType: 'VIEW' as const,
        userAgent: navigator.userAgent,
        referrer: document.referrer || undefined,
        duration: 1 // Duración por defecto para vistas
      };      this.logger.info('🚀 PRODUCT VIEW TRACKING INITIATED', {
        requestId: this.requestCounter,
        productId,
        url,
        cooldownStatus: lastTracked ? `${now - lastTracked}ms since last` : 'first time',
        willExecute: true
      }, 'AnalyticsTrackingInterceptor');

      // Ejecutar tracking con delay de 100ms para no bloquear la UI
      setTimeout(() => {
        this.analyticsService.trackProductInteraction(trackingData).subscribe({
          next: () => {
            this.logger.debug('Product view tracked automatically', {
              productId,
              url
            }, 'AnalyticsTrackingInterceptor');
          },
          error: (error) => {
            // Error silencioso - no debe afectar la UX del usuario
            this.logger.debug('Failed to track product view', {
              error: error.message,
              productId,
              url
            }, 'AnalyticsTrackingInterceptor');
          }
        });
      }, 100);

    } catch (error) {
      this.logger.debug('Error in automatic tracking', {
        error: error instanceof Error ? error.message : 'Unknown error',
        url
      }, 'AnalyticsTrackingInterceptor');
    }
  }
  private extractProductId(url: string): string | null {
    // Extraer UUID del final de la URL
    const uuidRegex = /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i;
    const match = url.match(uuidRegex);
    return match ? match[1] : null;
  }  /**
   * Limpia entradas antiguas del cache de tracking (más de 1 minuto)
   */
  private cleanupTrackingCache(): void {
    const oneMinuteAgo = Date.now() - (60 * 1000);
    
    // Limpiar cache local
    for (const [productId, timestamp] of this.recentlyTracked.entries()) {
      if (timestamp < oneMinuteAgo) {
        this.recentlyTracked.delete(productId);
      }
    }
    
    // Limpiar cache global
    for (const [productId, timestamp] of AnalyticsTrackingInterceptor.globalTrackingCache.entries()) {
      if (timestamp < oneMinuteAgo) {
        AnalyticsTrackingInterceptor.globalTrackingCache.delete(productId);
      }
    }
  }
  /**
   * Limpia el cache de sesión (se puede llamar manualmente o programáticamente)
   */
  public clearSessionCache(): void {
    this.sessionTracked.clear();
    AnalyticsTrackingInterceptor.globalTrackingCache.clear();
    this.logger.info('🧹 Session tracking cache cleared', {}, 'AnalyticsTrackingInterceptor');
  }

  /**
   * Obtiene estadísticas de tracking para debugging
   */
  public getTrackingStats(): { sessionsTracked: number; recentlyTracked: number; globalTracked: number; requestCount: number } {
    return {
      sessionsTracked: this.sessionTracked.size,
      recentlyTracked: this.recentlyTracked.size,
      globalTracked: AnalyticsTrackingInterceptor.globalTrackingCache.size,
      requestCount: this.requestCounter
    };
  }
}
