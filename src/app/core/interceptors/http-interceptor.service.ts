import { Injectable, inject } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable, throwError, timer } from 'rxjs';
import { catchError, mergeMap, finalize, tap } from 'rxjs/operators';

import { TokenService } from '../../auth/services/token.service';
import { LoadingStateService } from '../services/loading-state.service';
import { NotificationStateService } from '../services/notification-state.service';
import { LoggerService } from '../services/logger.service';

export interface HttpConfig {
  excludeFromLoading?: boolean;
  requiresAuth?: boolean;
  retryCount?: number;
  retryDelay?: number;
  skipErrorNotification?: boolean;
}

/**
 * Interceptor HTTP que maneja autenticación, loading states, errores y reintentos
 * Es inteligente respecto a qué endpoints requieren headers de autenticación
 */
@Injectable()
export class HttpInterceptorService implements HttpInterceptor {
  private readonly tokenService = inject(TokenService);
  private readonly loadingState = inject(LoadingStateService);
  private readonly notificationState = inject(NotificationStateService);
  private readonly logger = inject(LoggerService);  // Endpoints que NO requieren autenticación
  private readonly publicEndpoints = [
    '/auth/login',
    '/auth/register',
    '/auth/refresh',
    '/public',
    '/assets',
    '/products/consumer-products',
    '/products/',  // Para detalles de productos individuales (GET /products/{id})
    '/visual-representation/principal-image',
    '/visual-representation/images',
    '/visual-representation/model3D',    // ✅ Modelo 3D es público
    '/visual-representation/experienceAR', // ✅ Experiencia AR es pública  
    '/categories',  // Las categorías también son públicas
    '/analytics/track-click',  // Tracking de clicks es público
    '/analytics/priority-products',  // Lista de productos prioritarios es pública
    '/analytics/critical-products',  // Lista de productos críticos es pública
    '/analytics/product/',  // Métricas de productos individuales son públicas
    '/analytics/queue-theory-demo/'  // Demo educativa es pública
  ];

  // Endpoints que NO deben mostrar loading global
  private readonly silentEndpoints = [
    '/auth/check-token',
    '/auth/refresh',
    '/health',
    '/ping',
    '/analytics/track-click'  // Tracking silencioso sin loading
  ];
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Para debugging, vamos a ser menos agresivos con las transformaciones
    const config = this.extractConfig(req);
    
    // Solo agregar headers si realmente es necesario
    let modifiedReq = req;
    
    // Solo para endpoints que requieren autenticación
    if (!this.isPublicEndpoint(req.url)) {
      modifiedReq = this.addHeaders(req, config);
    }

    const operationKey = this.generateOperationKey(req);

    this.logger.debug('HTTP Request intercepted', {
      url: req.url,
      method: req.method,
      isPublic: this.isPublicEndpoint(req.url),
      requiresAuth: config.requiresAuth
    });

    // Iniciar loading si no está excluido
    if (!config.excludeFromLoading && !this.isSilentEndpoint(req.url)) {
      this.loadingState.startLoading(operationKey, 'Procesando solicitud...');
    }

    return next.handle(modifiedReq).pipe(
      tap((event) => {
        if (event instanceof HttpResponse) {
          this.logger.debug('HTTP Response received', {
            url: req.url,
            status: event.status,
            hasBody: !!event.body
          });
        }
      }),      
      // Manejo de errores simplificado para debugging
      catchError((error: HttpErrorResponse) => {
        this.logger.error('HTTP Error intercepted', {
          url: req.url,
          status: error.status,
          message: error.message,
          error: error.error
        });
        
        // Solo mostrar notificación si no es login (para evitar conflictos)
        if (!req.url.includes('/auth/login') && !config.skipErrorNotification) {
          this.handleErrorNotification(error);
        }
        
        return throwError(() => error);
      }),
      
      // Finalizar loading
      finalize(() => {
        if (!config.excludeFromLoading && !this.isSilentEndpoint(req.url)) {
          this.loadingState.stopLoading(operationKey);
        }
      })
    );
  }
  /**
   * Agrega headers necesarios basándose en la configuración y el endpoint
   */
  private addHeaders(req: HttpRequest<any>, config: HttpConfig): HttpRequest<any> {
    let headers = req.headers;

    // Solo agregar headers de autenticación si el endpoint lo requiere
    if (config.requiresAuth && this.requiresAuth(req.url)) {
      const token = this.tokenService.getToken();
      if (token) {
        headers = headers.set('Authorization', `Bearer ${token}`);
        this.logger.debug('Header de autorización agregado', { url: req.url });
      } else {
        // ✅ Solo mostrar warning si NO es un endpoint público
        if (!this.isPublicEndpoint(req.url)) {
          this.logger.warn('Token no disponible para endpoint que requiere autenticación', { url: req.url });
        } else {
          this.logger.debug('Endpoint público accedido sin token (normal)', { url: req.url });
        }
      }
    }

    // Headers comunes solo si no es un endpoint público
    if (!this.isPublicEndpoint(req.url)) {
      // Agregar Content-Type solo si no es multipart/form-data (archivos)
      if (!headers.has('Content-Type') && !(req.body instanceof FormData)) {
        headers = headers.set('Content-Type', 'application/json');
      }

      // Headers adicionales para APIs privadas
      headers = headers.set('X-Requested-With', 'XMLHttpRequest');
      headers = headers.set('Accept', 'application/json');
    }

    return req.clone({ headers });
  }

  /**
   * Extrae configuración de los headers de la request
   */
  private extractConfig(req: HttpRequest<any>): HttpConfig {
    const config: HttpConfig = {
      excludeFromLoading: req.headers.has('X-Skip-Loading'),
      requiresAuth: !this.isPublicEndpoint(req.url),
      retryCount: parseInt(req.headers.get('X-Retry-Count') || '0'),
      retryDelay: parseInt(req.headers.get('X-Retry-Delay') || '1000'),
      skipErrorNotification: req.headers.has('X-Skip-Error-Notification')
    };

    // Limpiar headers de configuración para no enviarlos al servidor
    const headersToRemove = [
      'X-Skip-Loading',
      'X-Retry-Count', 
      'X-Retry-Delay',
      'X-Skip-Error-Notification'
    ];

    return config;
  }  /**
   * Verifica si un endpoint es público (no requiere autenticación)
   */
  private isPublicEndpoint(url: string): boolean {
    // ✅ Usar la lista centralizada de endpoints públicos
    return this.publicEndpoints.some(endpoint => {
      // Verificar coincidencia exacta o si la URL comienza con el endpoint
      return url.includes(endpoint);
    });
  }

  /**
   * Verifica si un endpoint requiere autenticación
   */
  private requiresAuth(url: string): boolean {
    return !this.isPublicEndpoint(url);
  }

  /**
   * Verifica si un endpoint debe ser silencioso (sin loading global)
   */
  private isSilentEndpoint(url: string): boolean {
    return this.silentEndpoints.some(endpoint => url.includes(endpoint));
  }

  /**
   * Genera una clave única para la operación de loading
   */
  private generateOperationKey(req: HttpRequest<any>): string {
    return `http_${req.method}_${req.url.split('?')[0].replace(/[^a-zA-Z0-9]/g, '_')}`;
  }

  /**
   * Maneja reintentos inteligentes
   */
  private handleRetry(errors: Observable<any>, maxRetries: number, delay: number): Observable<any> {
    if (maxRetries <= 0) {
      return errors; // No hacer reintentos
    }

    return errors.pipe(
      mergeMap((error: HttpErrorResponse, index) => {
        // Solo reintentar en ciertos casos
        const shouldRetry = (
          error.status >= 500 || // Errores del servidor
          error.status === 0 || // Error de conexión
          error.status === 408 || // Timeout
          error.status === 429 // Rate limiting
        ) && index < maxRetries;

        if (shouldRetry) {
          this.logger.warn(`Reintentando request (${index + 1}/${maxRetries})`, {
            url: error.url,
            status: error.status
          });
          return timer(delay * Math.pow(2, index)); // Backoff exponencial
        }

        return throwError(() => error);
      })
    );
  }

  /**
   * Maneja errores HTTP de manera centralizada
   */
  private handleError(error: HttpErrorResponse, config: HttpConfig): Observable<never> {
    this.logger.error('Error HTTP', {
      status: error.status,
      message: error.message,
      url: error.url
    });

    // No mostrar notificación si está configurado para omitirla
    if (!config.skipErrorNotification) {
      let userMessage = 'Ha ocurrido un error inesperado.';

      switch (error.status) {
        case 0:
          userMessage = 'No se pudo conectar con el servidor. Verifica tu conexión a internet.';
          break;
        case 401:
          userMessage = 'Sesión expirada. Por favor, inicia sesión nuevamente.';
          break;
        case 403:
          userMessage = 'No tienes permisos para realizar esta acción.';
          break;
        case 404:
          userMessage = 'El recurso solicitado no fue encontrado.';
          break;
        case 408:
          userMessage = 'La solicitud ha expirado. Por favor, inténtalo de nuevo.';
          break;
        case 429:
          userMessage = 'Demasiadas solicitudes. Por favor, espera un momento e inténtalo de nuevo.';
          break;
        case 500:
          userMessage = 'Error interno del servidor. Por favor, inténtalo más tarde.';
          break;
        case 502:
        case 503:
        case 504:
          userMessage = 'El servicio no está disponible temporalmente. Por favor, inténtalo más tarde.';
          break;
      }

      this.notificationState.error(userMessage);
    }

    return throwError(() => error);
  }

  /**
   * Maneja las notificaciones de error de manera simplificada
   */
  private handleErrorNotification(error: HttpErrorResponse): void {
    let userMessage = 'Ha ocurrido un error inesperado.';

    switch (error.status) {
      case 0:
        userMessage = 'No se pudo conectar con el servidor. Verifica tu conexión a internet.';
        break;
      case 401:
        userMessage = 'Sesión expirada. Por favor, inicia sesión nuevamente.';
        break;
      case 403:
        userMessage = 'No tienes permisos para realizar esta acción.';
        break;
      case 404:
        userMessage = 'El recurso solicitado no fue encontrado.';
        break;
      case 500:
        userMessage = 'Error interno del servidor. Por favor, inténtalo más tarde.';
        break;
    }

    this.notificationState.error(userMessage);
  }
}
