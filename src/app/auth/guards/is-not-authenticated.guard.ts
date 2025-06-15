import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthStatus } from '../interfaces';
import { AuthService } from '../services/auth.service';

export const isNotAuthenticatedGuard: CanActivateFn = (_route, _state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  
  const status = auth.authStatus();
  
  // Si está verificando, esperar a que termine
  if (status === AuthStatus.checking) {
    // Permitir acceso temporalmente para evitar bloqueos
    return true;
  }
  
  // Si no está autenticado, permitir acceso
  if (status === AuthStatus.notAuthenticated) {
    return true;
  }
  
  // Si está autenticado, redirigir a home
  return router.createUrlTree(['/home']);
};
