import { Injectable, signal, computed } from '@angular/core';
import { HttpResponse } from '@angular/common/http';

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  expiresAt: number;
  etag?: string;
  lastModified?: string;
}

export interface CacheConfig {
  ttl?: number;
  maxSize?: number;
  strategy?: 'lru' | 'fifo';
}

@Injectable({
  providedIn: 'root'
})
export class HttpCacheService {
  private readonly _cache = signal<Map<string, CacheEntry>>(new Map());
  private readonly _accessOrder = signal<string[]>([]);

  private readonly defaultConfig: Required<CacheConfig> = {
    ttl: 5 * 60 * 1000,
    maxSize: 100,
    strategy: 'lru'
  };

  public readonly cacheSize = computed(() => this._cache().size);
  public readonly cacheKeys = computed(() => Array.from(this._cache().keys()));
  public readonly hitRate = computed(() => {
    const cache = this._cache();
    if (cache.size === 0) return 0;
    
    let hits = 0;
    let total = 0;
    cache.forEach(entry => {
      total++;
      if (entry.timestamp > Date.now() - 60000) hits++;
    });
    
    return total > 0 ? (hits / total) * 100 : 0;
  });

  /**
   * Obtiene una entrada del caché
   */
  get<T>(key: string): T | null {
    const cache = this._cache();
    const entry = cache.get(key);

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      return null;
    }

    this.updateAccessOrder(key);

    return entry.data;
  }

  /**
   * Almacena una entrada en el caché
   */
  set<T>(key: string, data: T, config?: Partial<CacheConfig>, response?: HttpResponse<T>): void {
    const finalConfig = { ...this.defaultConfig, ...config };
    const now = Date.now();

    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: now + finalConfig.ttl,
      etag: response?.headers.get('etag') || undefined,
      lastModified: response?.headers.get('last-modified') || undefined
    };

    if (this._cache().size >= finalConfig.maxSize) {
      this.evict(finalConfig.strategy);
    }

    this._cache.update(cache => {
      const newCache = new Map(cache);
      newCache.set(key, entry);
      return newCache;
    });

    this.updateAccessOrder(key);
  }

  /**
   * Elimina una entrada del caché
   */
  delete(key: string): boolean {
    const cache = this._cache();
    if (cache.has(key)) {
      this._cache.update(current => {
        const newCache = new Map(current);
        newCache.delete(key);
        return newCache;
      });

      this._accessOrder.update(order => order.filter(k => k !== key));
      return true;
    }
    return false;
  }

  /**
   * Verifica si una entrada existe y no ha expirado
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Limpia el caché completamente
   */
  clear(): void {
    this._cache.set(new Map());
    this._accessOrder.set([]);
  }

  /**
   * Limpia entradas expiradas
   */
  cleanup(): void {
    const now = Date.now();
    const cache = this._cache();
    const expiredKeys: string[] = [];

    cache.forEach((entry, key) => {
      if (now > entry.expiresAt) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach(key => this.delete(key));
  }

  /**
   * Invalida entradas por patrón
   */
  invalidatePattern(pattern: string | RegExp): number {
    const cache = this._cache();
    const keysToDelete: string[] = [];
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;

    cache.forEach((_, key) => {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.delete(key));
    return keysToDelete.length;
  }
  /**
   * Obtiene estadísticas del caché
   */
  getStats() {
    const cache = this._cache();
    const now = Date.now();
    let expired = 0;
    let valid = 0;

    cache.forEach(entry => {
      if (now > entry.expiresAt) {
        expired++;
      } else {
        valid++;
      }
    });

    return {
      totalEntries: cache.size,
      validEntries: valid,
      expiredEntries: expired,
      hitRate: this.hitRate(),
      maxSize: this.defaultConfig.maxSize
    };
  }

  /**
   * Verifica si una request puede usar caché basándose en ETags
   */
  canUseETag(key: string, etag?: string): boolean {
    if (!etag) return false;
    
    const entry = this._cache().get(key);
    return entry?.etag === etag;
  }

  /**
   * Verifica si una request puede usar caché basándose en Last-Modified
   */
  canUseLastModified(key: string, lastModified?: string): boolean {
    if (!lastModified) return false;
    
    const entry = this._cache().get(key);
    return entry?.lastModified === lastModified;
  }

  /**
   * Actualiza el orden de acceso para LRU
   */
  private updateAccessOrder(key: string): void {
    this._accessOrder.update(order => {
      const newOrder = order.filter(k => k !== key);
      newOrder.push(key);
      return newOrder;
    });
  }

  /**
   * Elimina entradas según la estrategia configurada
   */
  private evict(strategy: 'lru' | 'fifo'): void {
    const accessOrder = this._accessOrder();
    
    if (accessOrder.length === 0) return;

    const keyToEvict = strategy === 'lru' 
      ? accessOrder[0]
      : accessOrder[0];

    this.delete(keyToEvict);
  }
}
