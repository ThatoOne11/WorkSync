import { Injectable, inject } from '@angular/core';
import { from } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { SettingsService } from './settings.service';

const BROWSER_ID_KEY = 'workSyncBrowserId';

@Injectable({
  providedIn: 'root',
})
export class ProjectHistoryService {
  private supabase = inject(SupabaseService).supabase;
  private settingsService = inject(SettingsService);
  private getBrowserId = () => localStorage.getItem(BROWSER_ID_KEY);

  getProjectHistory(projectId: number) {
    const browserId = this.getBrowserId();
    const settings = this.settingsService.getSettings();

    if (!browserId || !settings) {
      return from(Promise.reject('User not properly configured.'));
    }

    const promise = this.supabase.functions
      .invoke('get-project-history', {
        body: { projectId, browserId, settings },
      })
      .then(({ data, error }) => {
        if (error) throw error;
        return data;
      });
    return from(promise);
  }
}
