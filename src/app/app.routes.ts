import { Routes, CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { SettingsService } from './core/services/settings.service';

const canActivateMainRoutes: CanActivateFn = (): boolean => {
  const settingsService = inject(SettingsService);
  const router = inject(Router);

  const settings = settingsService.settings();

  // Checks if all mandatory Clockify settings are present
  if (settings && settings.apiKey && settings.workspaceId && settings.userId) {
    return true;
  }

  // Settings are missing, redirect to the settings page
  router.navigate(['/settings']);
  return false;
};

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
    path: 'projects/:id/history',
    loadComponent: () =>
      import('./features/project-history/project-history').then(
        (m) => m.ProjectHistory,
      ),
    canActivate: [canActivateMainRoutes],
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./features/settings/settings').then((m) => m.Settings),
  },
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
];
