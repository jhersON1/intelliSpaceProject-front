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
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd)
      )
      .subscribe((event: NavigationEnd) => {
        this.scrollToTop();
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
        behavior: 'instant'
      });
    } catch (error) {
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
