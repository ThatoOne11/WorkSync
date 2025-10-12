// thatoone11/worksync/WorkSync-bd67a28866dbaadf83e92d302a1e77aca0512794/src/app/core/services/settings.service.ts
import { Injectable, inject } from '@angular/core';
import { from } from 'rxjs';
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
const BROWSER_ID_KEY = 'workSyncBrowserId';

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private supabase = inject(SupabaseService).supabase;

  // --- Browser Identity Management ---
  private getBrowserId(): string | null {
    return localStorage.getItem(BROWSER_ID_KEY);
  }

  private createOrGetBrowserId(): string {
    let browserId = this.getBrowserId();
    if (!browserId) {
      browserId = crypto.randomUUID();
      localStorage.setItem(BROWSER_ID_KEY, browserId);
    }
    return browserId;
  }

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
  async saveSettings(settings: AppSettings): Promise<void> {
    // FIX: If both email toggles are false, clear the notificationEmail field before saving.
    const isEmailDisabled =
      !settings.enableEmailNotifications && !settings.enablePacingAlerts;

    if (isEmailDisabled) {
      settings.notificationEmail = '';
    }

    if (settings.notificationEmail) {
      settings.notificationEmail = settings.notificationEmail.toLowerCase();
    }

    const browserId = this.createOrGetBrowserId();

    // 1. Save to local storage for immediate UI use
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));

    // 2. Sync to Supabase for background jobs
    const { error } = await this.supabase.functions.invoke('sync-settings', {
      body: { settings, browserId },
    });

    if (error) {
      console.error('Error syncing settings to server:', error);
      throw error;
    }
  }

  // Removes all settings from localStorage.
  async clearSettings(): Promise<void> {
    const browserId = this.getBrowserId();
    // 1. Clear local storage
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
    localStorage.removeItem(BROWSER_ID_KEY);

    // 2. Trigger server-side deletion if an ID existed
    if (browserId) {
      await this.supabase.functions.invoke('delete-user-data', {
        body: { browserId },
      });
    }
  }

  // This function remains as it invokes a Supabase function, not settings persistence.
  runWeeklySummary() {
    const settings = this.getSettings();
    const browserId = this.getBrowserId(); // Get the current browser ID

    // FIX: Pass both the settings AND the browserId in the request body
    const promise = this.supabase.functions
      .invoke('create-weekly-summaries', {
        body: { settings, browserId },
      })
      .then(({ data, error }) => {
        if (error) throw error;
        return data;
      });
    return from(promise);
  }
}
