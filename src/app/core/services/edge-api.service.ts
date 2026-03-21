import { Injectable, inject } from '@angular/core';
import { from, Observable } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { SettingsService } from './settings.service';

@Injectable({
  providedIn: 'root',
})
export class EdgeApiService {
  private readonly supabase = inject(SupabaseService).supabase;
  private readonly settingsService = inject(SettingsService);

  /**
   * Generic wrapper for Supabase Edge Functions.
   * Automatically attaches `settings` and `browserId` to the payload.
   */
  invoke<T>(
    functionName: string,
    additionalPayload: Record<string, unknown> = {},
  ): Observable<T> {
    const browserId = this.settingsService.getBrowserId();

    const body = {
      ...additionalPayload,
      ...(browserId ? { browserId } : {}),
    };

    const promise = this.supabase.functions
      .invoke(functionName, { body })
      .then(({ data, error }) => {
        if (error) throw error;
        return data as T;
      });

    return from(promise);
  }
}
