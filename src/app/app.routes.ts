import {
  Routes,
  CanActivateFn,
  Router,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
} from '@angular/router';
import { inject } from '@angular/core';
import { SettingsService } from './core/services/settings.service';
import { Projects } from './features/projects/projects';
import { Settings } from './features/settings/settings';
import { Dashboard } from './features/dashboard/dashboard';

// Define the functional guard to check for required settings in localStorage
const canActivateMainRoutes: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
): boolean => {
  const settingsService = inject(SettingsService);
  const router = inject(Router);

  const settings = settingsService.getSettings();

  // Checks if all mandatory Clockify settings are present
  if (settings && settings.apiKey && settings.workspaceId && settings.userId) {
    return true; // Settings are present, allow access
  } else {
    // Settings are missing, redirect to the settings page
    router.navigate(['/settings']);
    return false;
  }
};

// Apply the guard to the protected routes
export const routes: Routes = [
  {
    path: 'dashboard',
    component: Dashboard,
    canActivate: [canActivateMainRoutes],
  },
  {
    path: 'projects',
    component: Projects,
    canActivate: [canActivateMainRoutes],
  },
  { path: 'settings', component: Settings },
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
];
