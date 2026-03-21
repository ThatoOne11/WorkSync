import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { z } from 'zod';
import { EdgeApiService } from '../../../core/services/edge-api.service';
import { SUPABASE_FUNCTIONS } from '../../../shared/constants/supabase.constants';

const CACHE_KEY = 'worksync_ai_insights';
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 Hour limit

@Injectable({
  providedIn: 'root',
})
export class SuggestionsService {
  private readonly api = inject(EdgeApiService);

  getSuggestions(): Observable<string[]> {
    // 1. Check the local cache first to save API costs
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached);
        // If the cache is less than 1 hour old, return it instantly!
        if (Date.now() - timestamp < CACHE_TTL_MS) {
          return of(data);
        }
      } catch (e) {
        localStorage.removeItem(CACHE_KEY);
      }
    }

    // 2. If no cache or cache expired, hit the expensive AI endpoint
    return this.api
      .invoke<{ suggestions: unknown }>(SUPABASE_FUNCTIONS.GENERATE_SUGGESTIONS)
      .pipe(
        map((response) => z.array(z.string()).parse(response.suggestions)),
        tap((data) => {
          // 3. Save the fresh AI response to the cache with a timestamp
          localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ data, timestamp: Date.now() }),
          );
        }),
      );
  }
}
