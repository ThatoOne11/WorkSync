import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { EdgeApiService } from './edge-api.service';
import { SUPABASE_FUNCTIONS } from '../shared/constants/supabase.constants';

@Injectable({
  providedIn: 'root',
})
export class SuggestionsService {
  private readonly api = inject(EdgeApiService);

  getSuggestions(): Observable<string[]> {
    return this.api
      .invoke<{
        suggestions: string[];
      }>(SUPABASE_FUNCTIONS.GENERATE_SUGGESTIONS)
      .pipe(map((response) => response.suggestions));
  }
}
