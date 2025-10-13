import { Injectable, inject } from '@angular/core';
import { from } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { SettingsService } from './settings.service';

export interface WeeklySummary {
  id: number;
  project_id: number;
  target_hours: number;
  logged_hours: number;
  week_ending_on: string;
}

const BROWSER_ID_KEY = 'workSyncBrowserId';

@Injectable({
  providedIn: 'root',
})
export class HistoricalDataService {
  private supabase = inject(SupabaseService).supabase;
  private settingsService = inject(SettingsService);
  private getBrowserId = () => localStorage.getItem(BROWSER_ID_KEY);

  getWeeklySummaries(projectId: number) {
    const browserId = this.getBrowserId();
    if (!browserId) return from(Promise.resolve([] as WeeklySummary[]));

    const promise = this.supabase
      .from('weekly_summaries')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', browserId)
      .order('week_ending_on', { ascending: true })
      .then(({ data }) => data as WeeklySummary[]);

    return from(promise);
  }

  backfillHistory(historicalTargets: any[]) {
    const settings = this.settingsService.getSettings();
    const browserId = this.getBrowserId();

    const promise = this.supabase.functions
      .invoke('backfill-history', {
        body: { settings, browserId, historicalTargets }, // Pass new data
      })
      .then(({ data, error }) => {
        if (error) throw error;
        return data;
      });
    return from(promise);
  }
}
