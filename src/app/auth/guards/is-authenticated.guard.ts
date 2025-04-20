import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';


export const isAuthenticatedGuard: CanActivateFn = (route, state) => {

  return false;
};
