import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { map, filter, take } from 'rxjs/operators';
import { toObservable } from '@angular/core/rxjs-interop';
import { AuthStatus } from '../interfaces';
import { AuthService } from '../services/auth.service';
import { LoggerService } from '../../core/services/logger.service';

export const isNotAuthenticatedGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const logger = inject(LoggerService);
  
  logger.info('Verificando acceso a ruta pública', { 
    url: state.url, 
    currentStatus: auth.authStatus() 
  }, 'isNotAuthenticatedGuard');
  
  return toObservable(auth.authStatus).pipe(
    filter(status => status !== AuthStatus.checking),
    take(1),
    map(status => {
      if (status === AuthStatus.notAuthenticated) {
        logger.info('Acceso permitido a ruta pública', { 
          url: state.url 
        }, 'isNotAuthenticatedGuard');
        return true;
      }
      
      logger.info('Usuario autenticado accediendo a ruta pública, redirigiendo a home', { 
        url: state.url,
        status 
      }, 'isNotAuthenticatedGuard');
      return router.createUrlTree(['/home']);
    })
  );
};
