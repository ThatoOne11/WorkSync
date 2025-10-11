import {
  Routes,
  CanActivateFn,
  Router, // Added import
  ActivatedRouteSnapshot, // Added import
  RouterStateSnapshot, // Added import
} from '@angular/router';
import { Projects } from './features/projects/projects';
import { Settings } from './features/settings/settings';
import { Dashboard } from './features/dashboard/dashboard';
import { inject } from '@angular/core'; // Added import
import { SettingsService } from './core/services/settings.service'; // Added import
import { map, Observable } from 'rxjs'; // Added import

// 1. Define the functional guard to check for required settings
const canActivateMainRoutes: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
): Observable<boolean> => {
  const settingsService = inject(SettingsService);
  const router = inject(Router);

  // Checks if all mandatory Clockify settings are present
  return settingsService.getSettings().pipe(
    map((settings) => {
      if (settings.apiKey && settings.workspaceId && settings.userId) {
        return true; // Settings are present, allow access
      } else {
        // Settings are missing, redirect to the settings page
        router.navigate(['/settings']);
        return false;
      }
    })
  );
};

// 2. Apply the guard to the protected routes
export const routes: Routes = [
  {
    path: 'dashboard',
    component: Dashboard,
    canActivate: [canActivateMainRoutes], // Protect dashboard
  },
  {
    path: 'projects',
    component: Projects,
    canActivate: [canActivateMainRoutes], // Protect projects
  },
  { path: 'settings', component: Settings },
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
];
