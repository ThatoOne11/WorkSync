import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { z } from 'zod';
import { EdgeApiService } from './edge-api.service';
import { SUPABASE_FUNCTIONS } from '../shared/constants/supabase.constants';
import {
  FocusProject,
  FocusProjectSchema,
} from '../shared/schemas/app.schemas';

@Injectable({
  providedIn: 'root',
})
export class TodayFocusService {
  private readonly api = inject(EdgeApiService);

  getTodaysFocus(): Observable<FocusProject[]> {
    return this.api
      .invoke<{ focusList: unknown }>(SUPABASE_FUNCTIONS.GET_TODAYS_FOCUS)
      .pipe(
        // STRICT ZOD BOUNDARY
        map((response) =>
          z.array(FocusProjectSchema).parse(response.focusList),
        ),
      );
  }
}
