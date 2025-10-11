import { Injectable, inject } from '@angular/core';
import { from } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { SettingsService } from './settings.service'; // Import SettingsService

export interface WeeklySummary {
  id: number;
  project_id: number;
  target_hours: number;
  logged_hours: number;
  week_ending_on: string;
}

@Injectable({
  providedIn: 'root',
})
export class HistoricalDataService {
  private supabase = inject(SupabaseService).supabase;
  private settingsService = inject(SettingsService); // Inject SettingsService

  getWeeklySummaries(projectId: number) {
    const promise = this.supabase
      .from('weekly_summaries')
      .select('*')
      .eq('project_id', projectId)
      .order('week_ending_on', { ascending: true })
      .then(({ data }) => data as WeeklySummary[]);

    return from(promise);
  }

  backfillHistory() {
    const settings = this.settingsService.getSettings();
    // Pass the settings in the function body
    const promise = this.supabase.functions
      .invoke('backfill-history', {
        body: { settings },
      })
      .then(({ data, error }) => {
        if (error) throw error;
        return data;
      });
    return from(promise);
  }
}
