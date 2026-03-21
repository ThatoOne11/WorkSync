import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { EdgeApiService } from './edge-api.service';
import { SUPABASE_FUNCTIONS } from '../shared/constants/supabase.constants';

@Injectable({
  providedIn: 'root',
})
export class ProjectHistoryService {
  private readonly api = inject(EdgeApiService);

  getProjectHistory(projectId: number): Observable<unknown> {
    return this.api.invoke<unknown>(SUPABASE_FUNCTIONS.GET_PROJECT_HISTORY, {
      projectId,
    });
  }
}
