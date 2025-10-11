import { Injectable, inject } from '@angular/core';
import { from } from 'rxjs';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root',
})
export class SuggestionsService {
  private supabase = inject(SupabaseService).supabase;

  getSuggestions() {
    const promise = this.supabase.functions
      .invoke('generate-suggestions')
      .then(({ data, error }) => {
        if (error) throw error;
        // The function now returns { suggestions: [...] }
        return (data.suggestions as string[]) ?? [];
      });

    return from(promise);
  }
}
