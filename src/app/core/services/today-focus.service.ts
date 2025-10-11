import { Injectable, inject } from '@angular/core';
import { from } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { SettingsService } from './settings.service'; // Import SettingsService

export interface FocusProject {
  name: string;
  requiredHoursToday: number;
}

@Injectable({
  providedIn: 'root',
})
export class TodayFocusService {
  private supabase = inject(SupabaseService).supabase;
  private settingsService = inject(SettingsService); // Inject SettingsService

  getTodaysFocus() {
    const settings = this.settingsService.getSettings();
    const promise = this.supabase.functions
      .invoke('get-todays-focus', {
        body: { settings },
      })
      .then(({ data, error }) => {
        if (error) throw error;
        return data.focusList as FocusProject[];
      });

    return from(promise);
  }
}
