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
  
  return toObservable(auth.authStatus).pipe(
    filter(status => status !== AuthStatus.checking),
    take(1),
    map(status => {
      if (status === AuthStatus.authenticated) {
        logger.info('Acceso permitido a ruta protegida', { 
          url: state.url 
        }, 'isAuthenticatedGuard');
        return true;
      }
      
      logger.warn('Acceso denegado a ruta protegida, redirigiendo a login', { 
        url: state.url,
        status 
      }, 'isAuthenticatedGuard');
      return router.createUrlTree(['/auth/login']);
    })
  );
};
