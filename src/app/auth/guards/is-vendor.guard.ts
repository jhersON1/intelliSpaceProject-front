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
    // Convertir el signal authStatus a observable y esperar hasta que no esté en 'checking'
  return toObservable(auth.authStatus).pipe(
    filter(status => status !== AuthStatus.checking), // Esperar hasta que no esté verificando
    take(1), // Tomar solo el primer valor válido
    map(status => {
      // Primero verificar si está autenticado
      if (status !== AuthStatus.authenticated) {
        logger.warn('Usuario no autenticado, redirigiendo a login', { 
          url: state.url,
          status 
        }, 'isVendorGuard');
        return router.createUrlTree(['/auth/login']);
      }
      
      // Verificar si es vendedor
      if (auth.isVendor()) {
        logger.info('Acceso permitido a ruta de vendedor', { 
          url: state.url,
          userRole: auth.currentUser()?.role
        }, 'isVendorGuard');
        return true;
      }
      
      // Si no es vendedor, denegar acceso y redirigir
      logger.warn('Acceso denegado a ruta de vendedor - usuario no es vendedor', { 
        url: state.url,
        userRole: auth.currentUser()?.role
      }, 'isVendorGuard');
      return router.createUrlTree(['/home']);
    })
  );
};
