import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { map, filter, take } from 'rxjs/operators';
import { toObservable } from '@angular/core/rxjs-interop';
import { AuthStatus } from '../interfaces';
import { AuthService } from '../services/auth.service';
import { LoggerService } from '../../core/services/logger.service';

export const isVendorGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const logger = inject(LoggerService);
  
  logger.info('Verificando acceso a ruta de vendedor', { 
    url: state.url, 
    currentStatus: auth.authStatus(),
    isVendor: auth.isVendor()
  }, 'isVendorGuard');

  return toObservable(auth.authStatus).pipe(
    filter(status => status !== AuthStatus.checking),
    take(1),
    map(status => {
      if (status !== AuthStatus.authenticated) {
        logger.warn('Usuario no autenticado, redirigiendo a login', { 
          url: state.url,
          status 
        }, 'isVendorGuard');
        return router.createUrlTree(['/auth/login']);
      }
      
      if (auth.isVendor()) {
        logger.info('Acceso permitido a ruta de vendedor', { 
          url: state.url,
          userRole: auth.currentUser()?.role
        }, 'isVendorGuard');
        return true;
      }
      
      logger.warn('Acceso denegado a ruta de vendedor - usuario no es vendedor', { 
        url: state.url,
        userRole: auth.currentUser()?.role
      }, 'isVendorGuard');
      return router.createUrlTree(['/home']);
    })
  );
};
