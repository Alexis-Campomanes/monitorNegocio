import { Routes } from '@angular/router';
import { authGuard, guestGuard, moduleMatch } from './core/guards';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    title: 'Iniciar sesión · Núcleo',
    loadComponent: () => import('./features/login/login').then((m) => m.Login),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell/shell').then((m) => m.Shell),
    children: [
      {
        path: 'pedidos/:id',
        title: 'Pedido · Núcleo',
        loadComponent: () => import('./features/order-detail/order-detail').then((m) => m.OrderDetail),
      },
      {
        path: ':module',
        canMatch: [moduleMatch],
        title: 'Núcleo',
        loadComponent: () => import('./features/module-list/module-list').then((m) => m.ModuleList),
      },
      { path: '', pathMatch: 'full', redirectTo: 'pedidos' },
    ],
  },
  { path: '**', redirectTo: '' },
];
