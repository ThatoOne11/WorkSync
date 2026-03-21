import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { z } from 'zod';
import { EdgeApiService } from '../../../core/services/edge-api.service';
import { SUPABASE_FUNCTIONS } from '../../../shared/constants/supabase.constants';
import { STORAGE_CONSTANTS } from '../../../shared/constants/storage.constants';
import { APP_CONSTANTS } from '../../../shared/constants/app.constants';

@Injectable({
  providedIn: 'root',
})
export class SuggestionsService {
  private readonly api = inject(EdgeApiService);

  getSuggestions(): Observable<string[]> {
    const cached = localStorage.getItem(
      STORAGE_CONSTANTS.AI_INSIGHTS_CACHE_KEY,
    );
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < APP_CONSTANTS.AI_CACHE_TTL_MS) {
          return of(data);
        }
      } catch (e) {
        localStorage.removeItem(STORAGE_CONSTANTS.AI_INSIGHTS_CACHE_KEY);
      }
    }

    return this.api
      .invoke<{ suggestions: unknown }>(SUPABASE_FUNCTIONS.GENERATE_SUGGESTIONS)
      .pipe(
        map((response) => z.array(z.string()).parse(response.suggestions)),
        tap((data) => {
          localStorage.setItem(
            STORAGE_CONSTANTS.AI_INSIGHTS_CACHE_KEY,
            JSON.stringify({ data, timestamp: Date.now() }),
          );
        }),
      );
  }
}
