import { ChangeDetectionStrategy, Component, effect, HostListener, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../auth/services/auth.service';
import { AuthStatus } from 'src/app/auth/interfaces';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NavbarComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  // Signals para el estado de autenticación
  public readonly isAuthenticated = computed(() => this.authService.isAuthenticated());
  public readonly isVendor = computed(() => this.authService.isVendor());
  public readonly currentUser = computed(() => this.authService.currentUser());

  isNavbarHidden = false;
  private lastScrollTop = 0;

  isMobileMenuOpen = false;
  isMobileSearchOpen = false;  constructor() {
    // Verificar el estado de autenticación al inicializar
    this.authService.checkAuthStatus().subscribe({
      next: (isAuth) => {
        console.log('Estado de autenticación verificado:', isAuth);
        console.log('Usuario actual:', this.currentUser());
        console.log('Es vendor:', this.isVendor());
        console.log('Está autenticado:', this.isAuthenticated());
      },
      error: (err) => {
        console.error('Error verificando estado de autenticación:', err);
      }
    });
    
    // Efecto para debug - escuchar cambios en las signals
    effect(() => {
      console.log('Navbar - Estado de auth cambió:', {
        isAuthenticated: this.isAuthenticated(),
        isVendor: this.isVendor(),
        currentUser: this.currentUser()
      });
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
    this.router.navigate(['/home']);
    this.isMobileMenuOpen = false;
  }
}
