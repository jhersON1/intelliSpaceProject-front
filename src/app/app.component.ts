import { Component, computed, effect, inject } from '@angular/core';
import { NavbarComponent } from "./core/components/navbar/navbar.component";
import { FooterComponent } from './core/components/footer/footer.component';
import { Router, RouterOutlet } from '@angular/router';
import { AuthService } from './auth/services/auth.service';
import { AuthStatus } from './auth/interfaces';
import { NotificationContainerComponent } from './shared/components/notification-container/notification-container.component';
import { ScrollToTopService } from './core/services';

@Component({
  selector: 'app-root',
  imports: [ NavbarComponent, FooterComponent, RouterOutlet, NotificationContainerComponent ],
  templateUrl: './app.component.html',
})
export class AppComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private scrollToTopService = inject(ScrollToTopService);

  public finishedAuthCheck = computed<boolean>( () => {
    if ( this.authService.authStatus() === AuthStatus.checking ) {
      return false;
    }

    return true;
  });

  private firstRun = true;

  authStatusChangedEffect = effect(() => {

    if (this.firstRun) { this.firstRun = false; return; }

    switch (this.authService.authStatus()) {
      case AuthStatus.authenticated:
      case AuthStatus.notAuthenticated:
        
        if (this.router.url === '/home') return;
        this.router.navigateByUrl('/home');
        break;
    }
  });
}
