import { Injectable, inject } from '@angular/core';
import { from } from 'rxjs';
import { SupabaseService } from './supabase.service';

export interface AppSettings {
  apiKey: string;
  workspaceId: string;
  userId: string;
  notificationEmail: string; // Add new property
  enableEmailNotifications: boolean; // Add new property
}

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private supabase = inject(SupabaseService).supabase;

  getSettings() {
    const promise = this.supabase
      .from('settings')
      .select('*')
      .then(({ data }) => {
        if (!data) return {} as AppSettings;
        // Convert array of key-value pairs to a settings object
        const settings = data.reduce((acc, { key, value }) => {
          let appKey = key;

          if (key.startsWith('clockify')) {
            // 1. Remove 'clockify' prefix: 'ApiKey', 'WorkspaceId', 'UserId'
            let strippedKey = key.substring('clockify'.length);
            // 2. Lowercase first letter: 'apiKey', 'workspaceId', 'userId'
            appKey = strippedKey.charAt(0).toLowerCase() + strippedKey.slice(1);
          }

          // For keys like 'notificationEmail' and 'enableEmailNotifications',
          // appKey remains unchanged, fixing the persistence bug.
          acc[appKey] = value;

          return acc;
        }, {} as any);
        // Ensure boolean is correctly typed
        settings.enableEmailNotifications =
          settings.enableEmailNotifications === 'true';
        return settings as AppSettings;
      });
    return from(promise);
  }

  saveSettings(settings: AppSettings) {
    const updates = [
      { key: 'clockifyApiKey', value: settings.apiKey },
      { key: 'clockifyWorkspaceId', value: settings.workspaceId },
      { key: 'clockifyUserId', value: settings.userId },
      { key: 'notificationEmail', value: settings.notificationEmail }, // Add new setting
      {
        key: 'enableEmailNotifications',
        value: String(settings.enableEmailNotifications),
      }, // Add new setting
    ];
    // Supabase doesn't have a bulk update, so we do it one by one.
    const promises = updates.map((s) =>
      this.supabase.from('settings').update({ value: s.value }).eq('key', s.key)
    );
    return from(Promise.all(promises));
  }

  runWeeklySummary() {
    const promise = this.supabase.functions
      .invoke('create-weekly-summaries')
      .then(({ data, error }) => {
        if (error) throw error;
        return data;
      });
    return from(promise);
  }
}
