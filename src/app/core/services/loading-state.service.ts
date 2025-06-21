import { Injectable, signal, computed } from '@angular/core';

export interface LoadingOperation {
  key: string;
  message?: string;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class LoadingStateService {
  private readonly _loadingOperations = signal<Map<string, LoadingOperation>>(new Map());
  
  // Señales públicas computadas
  public readonly isLoading = computed(() => this._loadingOperations().size > 0);
  public readonly loadingCount = computed(() => this._loadingOperations().size);
  public readonly currentOperations = computed(() => 
    Array.from(this._loadingOperations().values())
  );

  /**
   * Inicia una operación de carga
   */
  startLoading(key: string, message?: string): void {
    const operation: LoadingOperation = {
      key,
      message,
      timestamp: Date.now()
    };

    this._loadingOperations.update(current => {
      const newMap = new Map(current);
      newMap.set(key, operation);
      return newMap;
    });
  }

  /**
   * Detiene una operación de carga
   */
  stopLoading(key: string): void {
    this._loadingOperations.update(current => {
      const newMap = new Map(current);
      newMap.delete(key);
      return newMap;
    });
  }

  /**
   * Verifica si una operación específica está cargando
   */
  isLoadingOperation(key: string): boolean {
    return this._loadingOperations().has(key);
  }

  /**
   * Detiene todas las operaciones de carga
   */
  stopAllLoading(): void {
    this._loadingOperations.set(new Map());
  }

  /**
   * Obtiene el mensaje de una operación específica
   */
  getOperationMessage(key: string): string | undefined {
    return this._loadingOperations().get(key)?.message;
  }
}
