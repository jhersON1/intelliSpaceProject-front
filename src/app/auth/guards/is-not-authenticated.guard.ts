import { CanActivateFn } from '@angular/router';

export const isNotAuthenticatedGuard: CanActivateFn = (route, state) => {

  return true;
};
