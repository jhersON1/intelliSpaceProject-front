import { ChangeDetectionStrategy, ChangeDetectorRef, Component, HostListener, inject, computed, effect, signal, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../auth/services/auth.service';
import { MessagingService } from '../../services/messaging.service';
import { NotificationPanelComponent } from '../notification-panel/notification-panel.component';
import { AiSearchComponent } from '../ai-search/ai-search.component';
import { Subject, takeUntil, interval } from 'rxjs';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, NotificationPanelComponent, AiSearchComponent],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NavbarComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private messagingService = inject(MessagingService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  unreadMessagesCount = signal(0);

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
      
      return result;

    } catch (error) {
      console.warn('Error evaluating isVendor:', error);
      return false;
    }
  });

  public readonly isAdmin = computed(() => {
    try {
      const authenticated = this.authService.isAuthenticated();
      const admin = this.authService.isAdmin();
      const result = authenticated && admin;
      
      return result;

    } catch (error) {
      console.warn('Error evaluating isAdmin:', error);
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
  isMobileSearchOpen = false;  constructor() {
    effect(() => {
      const isAuth = this.isAuthenticated();
      const isVend = this.isVendor();
      const user = this.currentUser();
      
      console.log('Navbar effect triggered:', { isAuth, isVend, user });
      this.cdr.markForCheck();

      if (isAuth && isVend) {
        this.loadUnreadMessagesCount();
      } else {
        this.unreadMessagesCount.set(0);
      }
    });
  }

  ngOnInit() {
    if (this.isAuthenticated() && this.isVendor()) {
      this.loadUnreadMessagesCount();
      
      interval(30000)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          if (this.isAuthenticated() && this.isVendor()) {
            this.loadUnreadMessagesCount();
          }
        });
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadUnreadMessagesCount() {
    this.messagingService.getUnreadCount()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.unreadMessagesCount.set(response.count);
        },
        error: (error) => {
          console.error('Error loading unread messages count:', error);
        }
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
  }  logout(): void {
    this.authService.logout();
    this.isMobileMenuOpen = false;
    
    setTimeout(() => {
      this.router.navigate(['/home']);
    }, 100);
  }

  /**
   * Maneja cuando se realiza una búsqueda desde el navbar
   */
  onSearchPerformed(): void {
    this.router.navigate(['/home/products'], { 
      queryParams: { refresh: Date.now() }
    });
    this.isMobileSearchOpen = false;
    this.isMobileMenuOpen = false;
  }

  /**
   * Maneja cuando se limpia la búsqueda desde el navbar
   */
  onSearchCleared(): void {
    console.log('🧹 Búsqueda limpiada desde navbar');
  }

  /**
   * Navegar a la página de mensajes del vendor
   */
  navigateToMessages(): void {
    this.router.navigate(['/home/vendor/messages']);
    this.isMobileMenuOpen = false;
  }
}
