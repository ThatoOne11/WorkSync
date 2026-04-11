import { Injectable, inject } from '@angular/core';
import { from, Observable } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { SettingsService } from './settings.service';

export type StandardEdgeResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

@Injectable({
  providedIn: 'root',
})
export class EdgeApiService {
  private readonly supabase = inject(SupabaseService).supabase;
  private readonly settingsService = inject(SettingsService);

  /**
   * Generic wrapper for Supabase Edge Functions.
   * Automatically attaches `browserId` and strictly unwraps the { success, data, error } contract.
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
      .invoke<StandardEdgeResponse<T>>(functionName, { body })
      .then(({ data, error }) => {
        // 1. Catch network or SDK-level failures
        if (error) {
          throw new Error(
            error.message || 'Supabase edge function invocation failed.',
          );
        }

        // 2. Catch missing payloads
        if (!data) {
          throw new Error(
            `Invalid response: No data returned from ${functionName}.`,
          );
        }

        // 3. Catch domain-level errors from our standard JSON contract
        if (!data.success) {
          throw new Error(
            data.error || `Domain error occurred in ${functionName}.`,
          );
        }

        // 4. Safely return the explicit inner data payload
        return data.data as T;
      });

    return from(promise);
  }
}
