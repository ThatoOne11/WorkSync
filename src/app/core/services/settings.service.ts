import { Injectable, inject } from '@angular/core';
import { from } from 'rxjs';
import { SupabaseService } from './supabase.service';

export interface AppSettings {
  apiKey: string;
  workspaceId: string;
  userId: string;
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
        return data.reduce((acc, { key, value }) => {
          acc[
            key.replace('clockify', '').charAt(0).toLowerCase() + key.slice(9)
          ] = value;
          return acc;
        }, {} as AppSettings);
      });
    return from(promise);
  }

  saveSettings(settings: AppSettings) {
    const updates = [
      { key: 'clockifyApiKey', value: settings.apiKey },
      { key: 'clockifyWorkspaceId', value: settings.workspaceId },
      { key: 'clockifyUserId', value: settings.userId },
    ];
    // Supabase doesn't have a bulk update, so we do it one by one.
    const promises = updates.map((s) =>
      this.supabase.from('settings').update({ value: s.value }).eq('key', s.key)
    );
    return from(Promise.all(promises));
  }
}
