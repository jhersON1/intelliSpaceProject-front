import { ChangeDetectionStrategy, ChangeDetectorRef, Component, HostListener, inject, computed, effect } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../auth/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NavbarComponent {  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  // Signals para el estado de autenticación con protección contra evaluaciones innecesarias
  public readonly isAuthenticated = computed(() => {
    try {
      return this.authService.isAuthenticated();
    } catch (error) {
      console.warn('Error evaluating isAuthenticated:', error);
      return false;
    }
  });
    public readonly isVendor = computed(() => {
    try {
      const authenticated = this.authService.isAuthenticated();
      const vendor = this.authService.isVendor();
      const result = authenticated && vendor;
      
      // Debug logging temporal
      console.log('Navbar isVendor computed:', { authenticated, vendor, result });
      
      return result;
    } catch (error) {
      console.warn('Error evaluating isVendor:', error);
      return false;
    }
  });
  
  public readonly currentUser = computed(() => {
    try {
      return this.authService.isAuthenticated() ? this.authService.currentUser() : null;
    } catch (error) {
      console.warn('Error evaluating currentUser:', error);
      return null;
    }
  });

  isNavbarHidden = false;
  private lastScrollTop = 0;

  isMobileMenuOpen = false;
  isMobileSearchOpen = false;constructor() {
    // El AuthService ya verifica el estado de autenticación en su constructor
    // No es necesario verificarlo aquí también
    
    // Effect para forzar detección de cambios cuando el estado de auth cambie
    effect(() => {
      const isAuth = this.isAuthenticated();
      const isVend = this.isVendor();
      const user = this.currentUser();
      
      // Forzar detección de cambios cuando cambien los valores
      console.log('Navbar effect triggered:', { isAuth, isVend, user });
      this.cdr.markForCheck();
    });
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;

    if (currentScrollTop > this.lastScrollTop && currentScrollTop > 50) {
      this.isNavbarHidden = true;
    } else {
      this.isNavbarHidden = false;
    }

    this.lastScrollTop = currentScrollTop;
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;

    if (this.isMobileMenuOpen) {
      this.isMobileSearchOpen = false;
    }
  }

  toggleMobileSearch(): void {
    this.isMobileSearchOpen = !this.isMobileSearchOpen;

    if (this.isMobileSearchOpen) {
      this.isMobileMenuOpen = false;
    }
  }
  logout(): void {
    this.authService.logout();
    this.isMobileMenuOpen = false;
    
    // Navegar a home después de limpiar el estado
    setTimeout(() => {
      this.router.navigate(['/home']);
    }, 100);
  }
}
