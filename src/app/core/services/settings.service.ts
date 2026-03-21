import { Injectable, inject, signal } from '@angular/core';
import { from, Observable } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { STORAGE_CONSTANTS } from '../../shared/constants/storage.constants';
import { SUPABASE_FUNCTIONS } from '../../shared/constants/supabase.constants';
import {
  AppSettings,
  AppSettingsSchema,
} from '../../shared/schemas/app.schemas';

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private readonly supabase = inject(SupabaseService).supabase;

  // Expose settings as a read-only signal for reactive UI updates globally
  readonly settings = signal<AppSettings | null>(
    this.loadSettingsFromStorage(),
  );

  getBrowserId(): string | null {
    return localStorage.getItem(STORAGE_CONSTANTS.BROWSER_ID_KEY);
  }

  private createOrGetBrowserId(): string {
    let browserId = this.getBrowserId();
    if (!browserId) {
      browserId = crypto.randomUUID();
      localStorage.setItem(STORAGE_CONSTANTS.BROWSER_ID_KEY, browserId);
    }
    return browserId;
  }

  private loadSettingsFromStorage(): AppSettings | null {
    const settingsJson = localStorage.getItem(STORAGE_CONSTANTS.SETTINGS_KEY);
    if (!settingsJson) return null;

    try {
      // Zod safely parses, coerces booleans/strings, and ensures strict typing
      return AppSettingsSchema.parse(JSON.parse(settingsJson));
    } catch (e) {
      console.error('Error parsing settings from localStorage', e);
      return null;
    }
  }

  async saveSettings(newSettings: AppSettings): Promise<void> {
    const isEmailDisabled =
      !newSettings.enableEmailNotifications && !newSettings.enablePacingAlerts;

    if (isEmailDisabled) {
      newSettings.notificationEmail = '';
    } else if (newSettings.notificationEmail) {
      newSettings.notificationEmail =
        newSettings.notificationEmail.toLowerCase();
    }

    const browserId = this.createOrGetBrowserId();

    // 1. Sync to Supabase FIRST with the real API key
    const { error } = await this.supabase.functions.invoke(
      SUPABASE_FUNCTIONS.SYNC_SETTINGS,
      {
        body: { settings: newSettings, browserId },
      },
    );

    if (error) {
      console.error('Error syncing settings to server:', error);
      throw error;
    }

    // 2. SECURE THE CLIENT: Mask the key so it NEVER sits in plain text in the browser
    const safeSettings: AppSettings = {
      ...newSettings,
      apiKey: newSettings.apiKey ? '••••••••••••••••' : '',
    };

    // 3. Save the safe, masked version to LocalStorage and the Signal state
    localStorage.setItem(
      STORAGE_CONSTANTS.SETTINGS_KEY,
      JSON.stringify(safeSettings),
    );
    this.settings.set(safeSettings);
  }

  async clearSettings(): Promise<void> {
    const browserId = this.getBrowserId();

    // 1. Clear local storage
    localStorage.removeItem(STORAGE_CONSTANTS.SETTINGS_KEY);
    localStorage.removeItem(STORAGE_CONSTANTS.BROWSER_ID_KEY);

    // 2. Clear Signal state
    this.settings.set(null);

    // 3. Trigger server-side deletion if an ID existed
    if (browserId) {
      await this.supabase.functions.invoke(
        SUPABASE_FUNCTIONS.DELETE_USER_DATA,
        {
          body: { browserId },
        },
      );
    }
  }

  runWeeklySummary(): Observable<unknown> {
    const currentSettings = this.settings();
    const browserId = this.getBrowserId();

    const promise = this.supabase.functions
      .invoke(SUPABASE_FUNCTIONS.CREATE_WEEKLY_SUMMARIES, {
        body: { settings: currentSettings, browserId },
      })
      .then(({ data, error }) => {
        if (error) throw error;
        return data;
      });

    return from(promise);
  }
}
