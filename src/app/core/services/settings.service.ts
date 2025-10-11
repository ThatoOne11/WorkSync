import { Injectable, inject } from '@angular/core';
import { from, Observable } from 'rxjs';
import { SupabaseService } from './supabase.service';

export interface AppSettings {
  apiKey: string;
  workspaceId: string;
  userId: string;
  notificationEmail: string;
  enableEmailNotifications: boolean;
  enablePacingAlerts: boolean;
}

const SETTINGS_STORAGE_KEY = 'workSyncAppSettings';

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private supabase = inject(SupabaseService).supabase;

  // Retrieves settings directly from localStorage.
  getSettings(): AppSettings | null {
    const settingsJson = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!settingsJson) {
      return null;
    }
    try {
      // Parse the stored JSON and ensure boolean values are correctly typed.
      const settings = JSON.parse(settingsJson) as AppSettings;
      settings.enableEmailNotifications =
        String(settings.enableEmailNotifications) === 'true';
      return settings;
    } catch (e) {
      console.error('Error parsing settings from localStorage', e);
      return null;
    }
  }

  // Saves the provided settings object to localStorage.
  saveSettings(settings: AppSettings): void {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }

  // Removes all settings from localStorage.
  clearSettings(): void {
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
  }

  // This function remains as it invokes a Supabase function, not settings persistence.
  runWeeklySummary() {
    const settings = this.getSettings();
    // Pass the settings in the function body
    const promise = this.supabase.functions
      .invoke('create-weekly-summaries', {
        body: { settings },
      })
      .then(({ data, error }) => {
        if (error) throw error;
        return data;
      });
    return from(promise);
  }
}
