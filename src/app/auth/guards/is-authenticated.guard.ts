import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { map, filter, take } from 'rxjs/operators';
import { toObservable } from '@angular/core/rxjs-interop';
import { AuthStatus } from '../interfaces';
import { AuthService } from '../services/auth.service';
import { LoggerService } from '../../core/services/logger.service';

export const isAuthenticatedGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const logger = inject(LoggerService);
  
  logger.info('Verificando acceso a ruta protegida', { 
    url: state.url, 
    currentStatus: auth.authStatus() 
  }, 'isAuthenticatedGuard');
  
  // Convertir el signal authStatus a observable y esperar hasta que no esté en 'checking'
  return toObservable(auth.authStatus).pipe(
    filter(status => status !== AuthStatus.checking), // Esperar hasta que no esté verificando
    take(1), // Tomar solo el primer valor válido
    map(status => {
      // Si está autenticado, permitir acceso
      if (status === AuthStatus.authenticated) {
        logger.info('Acceso permitido a ruta protegida', { 
          url: state.url 
        }, 'isAuthenticatedGuard');
        return true;
      }
      
      // Si no está autenticado, redirigir a login
      logger.warn('Acceso denegado a ruta protegida, redirigiendo a login', { 
        url: state.url,
        status 
      }, 'isAuthenticatedGuard');
      return router.createUrlTree(['/auth/login']);
    })
  );
};
