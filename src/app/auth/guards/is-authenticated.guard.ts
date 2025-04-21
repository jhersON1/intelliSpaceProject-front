import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthStatus } from '../interfaces';
import { AuthService } from '../services/auth.service';


export const isAuthenticatedGuard: CanActivateFn = (_route, _state) => {

  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.authStatus() === AuthStatus.authenticated
    ? router.createUrlTree(['/home'])
    : true;   
};
