import { Injectable, inject } from '@angular/core';
import { from } from 'rxjs';
import { SupabaseService } from './supabase.service';

export interface WeeklySummary {
  id: number;
  project_id: number;
  target_hours: number;
  logged_hours: number;
  week_ending_on: string; // Comes as a string e.g., "2025-10-10"
}

@Injectable({
  providedIn: 'root',
})
export class HistoricalDataService {
  private supabase = inject(SupabaseService).supabase;

  getWeeklySummaries(projectId: number) {
    const promise = this.supabase
      .from('weekly_summaries')
      .select('*')
      .eq('project_id', projectId)
      .order('week_ending_on', { ascending: true }) // Get data in chronological order
      .then(({ data }) => data as WeeklySummary[]);

    return from(promise);
  }
}
