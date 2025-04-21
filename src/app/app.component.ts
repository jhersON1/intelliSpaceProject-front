import { Component, computed, effect, inject } from '@angular/core';
import { NavbarComponent } from "./core/components/navbar/navbar.component";
import { FooterComponent } from './core/components/footer/footer.component';
import { Router, RouterOutlet } from '@angular/router';
import { AuthService } from './auth/services/auth.service';
import { AuthStatus } from './auth/interfaces';

@Component({
  selector: 'app-root',
  imports: [ NavbarComponent, FooterComponent, RouterOutlet ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

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
