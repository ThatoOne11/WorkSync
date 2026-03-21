import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { EdgeApiService } from './edge-api.service';
import { SUPABASE_FUNCTIONS } from '../shared/constants/supabase.constants';

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
  ): Observable<unknown[]> {
    return this.api
      .invoke<{ data: unknown[] }>(SUPABASE_FUNCTIONS.GET_CLOCKIFY_DATA, {
        action: 'getTimeEntries',
        apiKey,
        workspaceId,
        userId,
        start,
        end,
      })
      .pipe(map((res) => res.data));
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
  ): Observable<unknown[]> {
    return this.api
      .invoke<{ data: unknown[] }>(SUPABASE_FUNCTIONS.GET_CLOCKIFY_DATA, {
        action: 'getClockifyProjects',
        apiKey,
        workspaceId,
      })
      .pipe(map((res) => res.data));
  }
}
