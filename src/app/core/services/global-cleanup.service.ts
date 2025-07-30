import { Injectable, inject } from '@angular/core';
import { Subject } from 'rxjs';

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
