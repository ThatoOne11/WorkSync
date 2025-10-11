import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SettingsService } from '../services/settings.service';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

export const canActivateMainRoutes: CanActivateFn = (): Observable<boolean> => {
  const settingsService = inject(SettingsService);
  const router = inject(Router);

  return settingsService.getSettings().pipe(
    map((settings) => {
      if (settings.apiKey && settings.workspaceId && settings.userId) {
        return true;
      } else {
        router.navigate(['/settings']);
        return false;
      }
    })
  );
};
