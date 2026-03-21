import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { z } from 'zod';
import { SUPABASE_FUNCTIONS } from '../../shared/constants/supabase.constants';
import { EdgeApiService } from './edge-api.service';
import {
  ClockifyTimeEntry,
  ClockifyTimeEntrySchema,
  ClockifyProjectSchema,
} from '../../shared/schemas/app.schemas';

@Injectable({
  providedIn: 'root',
})
export class ClockifyService {
  private readonly api = inject(EdgeApiService);

  getTimeEntries(
    apiKey: string,
    workspaceId: string,
    userId: string,
    start: string,
    end: string,
  ): Observable<ClockifyTimeEntry[]> {
    return this.api
      .invoke<{ data: unknown }>(SUPABASE_FUNCTIONS.GET_CLOCKIFY_DATA, {
        action: 'getTimeEntries',
        apiKey,
        workspaceId,
        userId,
        start,
        end,
      })
      .pipe(map((res) => z.array(ClockifyTimeEntrySchema).parse(res.data)));
  }

  getCurrentUserId(apiKey: string): Observable<unknown> {
    return this.api
      .invoke<{ data: unknown }>(SUPABASE_FUNCTIONS.GET_CLOCKIFY_DATA, {
        action: 'getCurrentUserId',
        apiKey,
      })
      .pipe(map((res) => res.data));
  }

  getClockifyProjects(
    apiKey: string,
    workspaceId: string,
  ): Observable<{ id: string; name: string }[]> {
    return this.api
      .invoke<{ data: unknown }>(SUPABASE_FUNCTIONS.GET_CLOCKIFY_DATA, {
        action: 'getClockifyProjects',
        apiKey,
        workspaceId,
      })
      .pipe(map((res) => z.array(ClockifyProjectSchema).parse(res.data)));
  }
}
