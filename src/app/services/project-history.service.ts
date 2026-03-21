import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { EdgeApiService } from './edge-api.service';
import { SUPABASE_FUNCTIONS } from '../shared/constants/supabase.constants';
import {
  HistoryPayload,
  HistoryPayloadSchema,
} from '../shared/schemas/app.schemas';

@Injectable({
  providedIn: 'root',
})
export class ProjectHistoryService {
  private readonly api = inject(EdgeApiService);

  getProjectHistory(projectId: number): Observable<HistoryPayload> {
    return this.api
      .invoke<unknown>(SUPABASE_FUNCTIONS.GET_PROJECT_HISTORY, { projectId })
      .pipe(map((response) => HistoryPayloadSchema.parse(response)));
  }
}
