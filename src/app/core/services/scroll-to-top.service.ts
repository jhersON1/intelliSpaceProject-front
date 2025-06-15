import { Injectable, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ScrollToTopService {
  private router = inject(Router);

  constructor() {
    this.initScrollToTop();
  }

  private initScrollToTop(): void {
    // Escuchar a los eventos de navegación
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd)
      )
      .subscribe((event: NavigationEnd) => {
        // Scroll al inicio de la página en cada navegación
        this.scrollToTop();
        
        // Log para debugging (opcional - se puede remover en producción)
        console.log(`[ScrollToTop] Navegación a: ${event.url}`);
      });
  }

  /**
   * Ejecuta el scroll al inicio de la página
   */
  private scrollToTop(): void {
    try {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'instant' // Cambiado a 'instant' para que sea inmediato
      });
    } catch (error) {
      // Fallback para navegadores que no soporten el objeto options
      window.scrollTo(0, 0);
    }
  }

  /**
   * Método público para forzar scroll al inicio manualmente
   */
  public forceScrollToTop(): void {
    this.scrollToTop();
  }
}
