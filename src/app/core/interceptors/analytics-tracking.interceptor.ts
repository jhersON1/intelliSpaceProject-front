import { Injectable, inject } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AnalyticsService } from '../services/analytics.service';
import { LoggerService } from '../services/logger.service';
import { API_ROUTES } from '../constants';

@Injectable()
export class AnalyticsTrackingInterceptor implements HttpInterceptor {
  private readonly analyticsService = inject(AnalyticsService);
  private readonly logger = inject(LoggerService);

  private recentlyTracked = new Map<string, number>();
  private readonly TRACKING_COOLDOWN = 5000;

  private requestCounter = 0;

  private sessionTracked = new Map<string, number>();
  private readonly SESSION_REVISIT_COOLDOWN = 30000;

  private static globalTrackingCache = new Map<string, number>();
  private static readonly GLOBAL_COOLDOWN = 3000;

  private readonly trackingEndpoints = [
    `${API_ROUTES.GET_PRODUCT_DETAIL}/`,
  ]; intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (req.method === 'GET') {
      this.logger.debug('📡 HTTP REQUEST DETECTED', {
        method: req.method,
        url: req.url,
        headers: Object.fromEntries(req.headers.keys().map(key => [key, req.headers.get(key)]))
      }, 'AnalyticsTrackingInterceptor.HTTP_LOG');
    }

    return next.handle(req).pipe(
      tap(event => {
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
  }

  private shouldTrackRequest(url: string): boolean {
    const productDetailPattern = /\/products\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

    const shouldTrack = productDetailPattern.test(url);

    return shouldTrack;
  }
  private trackProductView(url: string, response: HttpResponse<any>): void {
    try {
      const productId = this.extractProductId(url);

      if (!productId) {
        this.logger.debug('Could not extract product ID from URL', { url }, 'AnalyticsTrackingInterceptor');
        return;
      }

      if (!response.body || !response.body.id) {
        this.logger.debug('Response does not contain valid product data', { url }, 'AnalyticsTrackingInterceptor');
        return;
      }

      const now = Date.now();

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
      }

      this.sessionTracked.set(sessionKey, now);

      this.recentlyTracked.set(productId, now);
      AnalyticsTrackingInterceptor.globalTrackingCache.set(productId, now);

      this.cleanupTrackingCache();

      const trackingData = {
        productId: productId,
        interactionType: 'VIEW' as const,
        userAgent: navigator.userAgent,
        referrer: document.referrer || undefined,
        duration: 1
      }; this.logger.info('🚀 PRODUCT VIEW TRACKING INITIATED', {
        requestId: this.requestCounter,
        productId,
        url,
        cooldownStatus: lastTracked ? `${now - lastTracked}ms since last` : 'first time',
        willExecute: true
      }, 'AnalyticsTrackingInterceptor');

      setTimeout(() => {
        this.analyticsService.trackProductInteraction(trackingData).subscribe({
          next: () => {
            this.logger.debug('Product view tracked automatically', {
              productId,
              url
            }, 'AnalyticsTrackingInterceptor');
          },
          error: (error) => {
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
    const uuidRegex = /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i;
    const match = url.match(uuidRegex);
    return match ? match[1] : null;
  }

  private cleanupTrackingCache(): void {
    const oneMinuteAgo = Date.now() - (60 * 1000);

    for (const [productId, timestamp] of this.recentlyTracked.entries()) {
      if (timestamp < oneMinuteAgo) {
        this.recentlyTracked.delete(productId);
      }
    }

    for (const [productId, timestamp] of AnalyticsTrackingInterceptor.globalTrackingCache.entries()) {
      if (timestamp < oneMinuteAgo) {
        AnalyticsTrackingInterceptor.globalTrackingCache.delete(productId);
      }
    }
  }

  public clearSessionCache(): void {
    this.sessionTracked.clear();
    AnalyticsTrackingInterceptor.globalTrackingCache.clear();
    this.logger.info('🧹 Session tracking cache cleared', {}, 'AnalyticsTrackingInterceptor');
  }

  public getTrackingStats(): { sessionsTracked: number; recentlyTracked: number; globalTracked: number; requestCount: number } {
    return {
      sessionsTracked: this.sessionTracked.size,
      recentlyTracked: this.recentlyTracked.size,
      globalTracked: AnalyticsTrackingInterceptor.globalTrackingCache.size,
      requestCount: this.requestCounter
    };
  }
}
