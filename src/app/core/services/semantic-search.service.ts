import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, tap, finalize, of } from 'rxjs';
import { environment } from '@environments/environments';
import { LoggerService } from './logger.service';
import { LoadingStateService } from './loading-state.service';
import { NotificationStateService } from './notification-state.service';
import { Product } from '../../features/product/interfaces/product.interface';

export interface SemanticSearchResult {
  product: Product;
  score: number;
  relevance: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface SemanticSearchResponse {
  products: SemanticSearchResult[];
  totalFound: number;
  searchTime: number;
  query: string;
  usedThreshold?: number;
  suggestions?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class SemanticSearchService {
  private readonly http = inject(HttpClient);
  private readonly logger = inject(LoggerService);
  private readonly loadingState = inject(LoadingStateService);
  private readonly notificationState = inject(NotificationStateService);
  private readonly baseUrl = environment.baseUrl;

  // Signal para el estado de búsqueda actual
  private readonly _isSearching = signal(false);
  private readonly _lastSearchQuery = signal<string>('');
  private readonly _lastSearchResults = signal<SemanticSearchResult[]>([]);

  // Signals públicos computados
  public readonly isSearching = this._isSearching.asReadonly();
  public readonly lastSearchQuery = this._lastSearchQuery.asReadonly();
  public readonly lastSearchResults = this._lastSearchResults.asReadonly();

  /**
   * Realiza una búsqueda semántica usando IA
   */
  semanticSearch(query: string, limit: number = 10): Observable<SemanticSearchResponse> {
    if (!query.trim()) {
      this.logger.warn('Query vacío para la búsqueda semántica');
      return of({
        products: [],
        totalFound: 0,
        searchTime: 0,
        query: query
      });
    }

    this._isSearching.set(true);
    this._lastSearchQuery.set(query);
    this.loadingState.startLoading('semanticSearch', `Buscando: "${query}"`);

    const params = new HttpParams()
      .set('query', query.trim())
      .set('limit', limit.toString());

    const searchUrl = `${this.baseUrl}/semantic-search`;

    this.logger.info('🤖 Iniciando búsqueda semántica con IA', { 
      query: query.trim(), 
      limit,
      url: searchUrl
    });

    return this.http.get<SemanticSearchResponse>(searchUrl, { params }).pipe(
      tap((response) => {
        this.logger.info('✅ Búsqueda semántica completada', {
          query: response.query,
          totalFound: response.totalFound,
          searchTime: response.searchTime,
          usedThreshold: response.usedThreshold
        });

        // Actualizar signals con los resultados
        this._lastSearchResults.set(response.products);

        // Mostrar notificación de éxito
        if (response.totalFound > 0) {
          this.notificationState.success(
            `🎯 Encontré ${response.totalFound} producto${response.totalFound > 1 ? 's': ''} relacionado${response.totalFound > 1 ? 's': ''} con tu búsqueda`
          );
        } else {
          this.notificationState.info('🔍 No encontré productos que coincidan con tu búsqueda. Intenta con otras palabras.');
        }
      }),
      catchError((error) => {
        this.logger.error('❌ Error en búsqueda semántica', error);
        this._lastSearchResults.set([]);
        
        this.notificationState.error(
          '🤖 Error en la búsqueda inteligente. Por favor, inténtalo de nuevo.'
        );
        
        // Devolver respuesta vacía en caso de error
        return of({
          products: [],
          totalFound: 0,
          searchTime: 0,
          query: query
        });
      }),
      finalize(() => {
        this._isSearching.set(false);
        this.loadingState.stopLoading('semanticSearch');
      })
    );
  }

  /**
   * Limpia los resultados de búsqueda actual
   */
  clearSearch(): void {
    this._lastSearchQuery.set('');
    this._lastSearchResults.set([]);
    this.logger.debug('🧹 Resultados de búsqueda limpiados');
  }

  /**
   * Verifica si hay una búsqueda activa
   */
  hasActiveSearch(): boolean {
    return this._lastSearchQuery().trim().length > 0;
  }

  /**
   * Obtiene los productos de los resultados de búsqueda (para compatibilidad con ProductWithImage)
   */
  getSearchProductsOnly(): Product[] {
    return this._lastSearchResults().map(result => result.product);
  }
}
