import { Injectable, inject } from '@angular/core';
import { from } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { SettingsService } from './settings.service'; // Import SettingsService

// ADDED: Define the constant key locally
const BROWSER_ID_KEY = 'workSyncBrowserId';

@Injectable({
  providedIn: 'root',
})
export class SuggestionsService {
  private supabase = inject(SupabaseService).supabase;
  private settingsService = inject(SettingsService); // Inject SettingsService

  // ADDED: Local helper to retrieve browser ID, mirroring project.service.ts
  private getBrowserId = (): string | null =>
    localStorage.getItem(BROWSER_ID_KEY);

  getSuggestions() {
    const settings = this.settingsService.getSettings();
    const browserId = this.getBrowserId(); // FIX: Get the browserId

    const promise = this.supabase.functions
      .invoke('generate-suggestions', {
        body: { settings, browserId }, // FIX: Pass both settings and browserId
      })
      .then(({ data, error }) => {
        if (error) throw error;
        return data.suggestions as string[];
      });

    return from(promise);
  }
}
