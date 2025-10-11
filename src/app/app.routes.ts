import { Routes } from '@angular/router';
import { canActivateMainRoutes } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard').then((m) => m.Dashboard),
    canActivate: [canActivateMainRoutes],
  },
  {
    path: 'projects',
    loadComponent: () =>
      import('./features/projects/projects').then((m) => m.Projects),
    canActivate: [canActivateMainRoutes],
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./features/settings/settings').then((m) => m.Settings),
  },
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
];
