import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthStatus } from '../interfaces';
import { AuthService } from '../services/auth.service';

export const isAuthenticatedGuard: CanActivateFn = (_route, _state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  
  const status = auth.authStatus();
  
  // Si está verificando, denegar temporalmente para evitar bloqueos
  if (status === AuthStatus.checking) {
    return router.createUrlTree(['/auth/login']);
  }
  
  // Si está autenticado, permitir acceso
  if (status === AuthStatus.authenticated) {
    return true;
  }
  
  // Si no está autenticado, redirigir a login
  return router.createUrlTree(['/auth/login']);
};
