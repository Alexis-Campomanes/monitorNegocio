import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router } from '@angular/router';
import { MODULE_IDS, ModuleId } from './models';
import { Store } from './store';

export const authGuard: CanActivateFn = () =>
  inject(Store).user() ? true : inject(Router).createUrlTree(['/login']);

export const guestGuard: CanActivateFn = () =>
  inject(Store).user() ? inject(Router).createUrlTree(['/pedidos']) : true;

export const moduleMatch: CanMatchFn = (_route, segments) =>
  MODULE_IDS.includes(segments[0]?.path as ModuleId);
