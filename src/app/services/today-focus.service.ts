import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { EdgeApiService } from './edge-api.service';
import { SUPABASE_FUNCTIONS } from '../shared/constants/supabase.constants';

export type FocusProject = {
  name: string;
  requiredHoursToday: number;
};

@Injectable({
  providedIn: 'root',
})
export class TodayFocusService {
  private readonly api = inject(EdgeApiService);

  getTodaysFocus(): Observable<FocusProject[]> {
    return this.api
      .invoke<{
        focusList: FocusProject[];
      }>(SUPABASE_FUNCTIONS.GET_TODAYS_FOCUS)
      .pipe(map((response) => response.focusList));
  }
}
