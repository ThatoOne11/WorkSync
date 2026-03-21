import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { z } from 'zod';
import { EdgeApiService } from '../../../core/services/edge-api.service';
import { SUPABASE_FUNCTIONS } from '../../../shared/constants/supabase.constants';

@Injectable({
  providedIn: 'root',
})
export class SuggestionsService {
  private readonly api = inject(EdgeApiService);

  getSuggestions(): Observable<string[]> {
    return this.api
      .invoke<{ suggestions: unknown }>(SUPABASE_FUNCTIONS.GENERATE_SUGGESTIONS)
      .pipe(map((response) => z.array(z.string()).parse(response.suggestions)));
  }
}
