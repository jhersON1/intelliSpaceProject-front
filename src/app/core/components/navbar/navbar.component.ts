
import { Component, HostListener, inject } from '@angular/core';
import { AuthService } from '../../../auth/services/auth.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent{
  private authService = inject(AuthService);
  
  isNavbarHidden = false;
  private lastScrollTop = 0;

  isMobileMenuOpen = false;
  isMobileSearchOpen = false;

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

  public isVendor(): boolean {
    return this.authService.isVendor();
  }
}
