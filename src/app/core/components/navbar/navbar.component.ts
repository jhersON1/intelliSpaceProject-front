import { ChangeDetectionStrategy, Component, effect, HostListener, inject, signal } from '@angular/core';
import { AuthService } from '../../../auth/services/auth.service';
import { AuthStatus } from 'src/app/auth/interfaces';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NavbarComponent {
  private authService = inject(AuthService);
  public isVendor = signal(false);


  isNavbarHidden = false;
  private lastScrollTop = 0;

  isMobileMenuOpen = false;
  isMobileSearchOpen = false;

  constructor() {
    effect(() => {
      const status = this.authService.authStatus();
      this.isVendor.set(
        status === AuthStatus.authenticated && this.authService.isVendor()
      );
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

}
