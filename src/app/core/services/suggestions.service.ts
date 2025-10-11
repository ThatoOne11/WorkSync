import { Injectable, inject } from '@angular/core';
import { from } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { SettingsService } from './settings.service'; // Import SettingsService

@Injectable({
  providedIn: 'root',
})
export class SuggestionsService {
  private supabase = inject(SupabaseService).supabase;
  private settingsService = inject(SettingsService); // Inject SettingsService

  getSuggestions() {
    const settings = this.settingsService.getSettings();
    const promise = this.supabase.functions
      .invoke('generate-suggestions', {
        body: { settings },
      })
      .then(({ data, error }) => {
        if (error) throw error;
        return data.suggestions as string[];
      });

    return from(promise);
  }
}
