import { Injectable, inject } from '@angular/core';
import { Observable, from } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { SettingsService } from './settings.service';
import { EdgeApiService } from './edge-api.service';
import {
  SUPABASE_FUNCTIONS,
  SUPABASE_TABLES,
} from '../../shared/constants/supabase.constants';

export type WeeklySummary = {
  id: number;
  project_id: number;
  target_hours: number;
  logged_hours: number;
  week_ending_on: string;
};

@Injectable({
  providedIn: 'root',
})
export class HistoricalDataService {
  private readonly supabase = inject(SupabaseService).supabase;
  private readonly settingsService = inject(SettingsService);
  private readonly api = inject(EdgeApiService);

  getWeeklySummaries(projectId: number): Observable<WeeklySummary[]> {
    const browserId = this.settingsService.getBrowserId();
    if (!browserId) return from(Promise.resolve([]));

    const promise = this.supabase
      .from(SUPABASE_TABLES.WEEKLY_SUMMARIES)
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', browserId)
      .order('week_ending_on', { ascending: true })
      .then(({ data, error }) => {
        if (error) throw error;
        return data as WeeklySummary[];
      });

    return from(promise);
  }

  backfillHistory(
    historicalTargets: unknown[],
  ): Observable<{ message: string }> {
    return this.api.invoke<{ message: string }>(
      SUPABASE_FUNCTIONS.BACKFILL_HISTORY,
      { historicalTargets },
    );
  }
}
