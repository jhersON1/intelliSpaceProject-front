import { Injectable, inject } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * Servicio para manejar la limpieza global de la aplicación
 * Especialmente útil durante el logout para cancelar subscriptions activas
 */
@Injectable({
  providedIn: 'root'
})
export class GlobalCleanupService {
  private readonly cleanupSubject = new Subject<void>();
  
  /**
   * Observable que emite cuando se debe hacer limpieza global
   */
  public readonly cleanup$ = this.cleanupSubject.asObservable();

  /**
   * Ejecuta la limpieza global de la aplicación
   * Debe ser llamado durante el logout
   */
  public executeCleanup(): void {
    this.cleanupSubject.next();
  }
}
