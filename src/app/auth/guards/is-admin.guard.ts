import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { map, filter, take } from 'rxjs/operators';
import { toObservable } from '@angular/core/rxjs-interop';
import { AuthStatus } from '../interfaces';
import { AuthService } from '../services/auth.service';
import { LoggerService } from '../../core/services/logger.service';

export const isAdminGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const logger = inject(LoggerService);
  
  logger.info('Verificando acceso a ruta de administrador', { 
    url: state.url, 
    currentStatus: auth.authStatus(),
    isAdmin: auth.isAdmin()
  }, 'isAdminGuard');
  
  return toObservable(auth.authStatus).pipe(
    filter(status => status !== AuthStatus.checking),
    take(1),
    map(status => {
      if (status !== AuthStatus.authenticated) {
        logger.warn('Usuario no autenticado, redirigiendo a login', { 
          url: state.url,
          status 
        }, 'isAdminGuard');
        return router.createUrlTree(['/auth/login']);
      }
      
      if (auth.isAdmin()) {
        logger.info('Acceso permitido a ruta de administrador', { 
          url: state.url,
          userRole: auth.currentUser()?.role
        }, 'isAdminGuard');
        return true;
      }
      
      logger.warn('Acceso denegado a ruta de administrador - usuario no es administrador', { 
        url: state.url,
        userRole: auth.currentUser()?.role
      }, 'isAdminGuard');
      return router.createUrlTree(['/home']);
    })
  );
};
