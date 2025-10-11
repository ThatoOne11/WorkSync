import { Injectable, inject } from '@angular/core';
import { from } from 'rxjs';
import { SupabaseService } from './supabase.service';

export interface FocusProject {
  name: string;
  requiredHoursToday: number;
}

@Injectable({
  providedIn: 'root',
})
export class TodayFocusService {
  private supabase = inject(SupabaseService).supabase;

  getTodaysFocus() {
    const promise = this.supabase.functions
      .invoke('get-todays-focus')
      .then(({ data, error }) => {
        if (error) throw error;
        // The function returns { focusList: [...] }
        return data.focusList as FocusProject[];
      });

    return from(promise);
  }
}
