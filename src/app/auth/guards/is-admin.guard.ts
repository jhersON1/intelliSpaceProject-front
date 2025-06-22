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
        }, 'isAdminGuard');
        return router.createUrlTree(['/auth/login']);
      }
      
      // Verificar si es administrador
      if (auth.isAdmin()) {
        logger.info('Acceso permitido a ruta de administrador', { 
          url: state.url,
          userRole: auth.currentUser()?.role
        }, 'isAdminGuard');
        return true;
      }
      
      // Si no es administrador, denegar acceso y redirigir
      logger.warn('Acceso denegado a ruta de administrador - usuario no es administrador', { 
        url: state.url,
        userRole: auth.currentUser()?.role
      }, 'isAdminGuard');
      return router.createUrlTree(['/home']);
    })
  );
};
