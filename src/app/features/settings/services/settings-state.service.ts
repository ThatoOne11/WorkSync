import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { HistoricalDataService } from '../../project-history/services/historical-data.service';
import { ProjectService } from '../../projects/services/project.service';
import { SettingsService } from '../../../core/services/settings.service';
import { ClockifyService } from '../../../core/services/clockify.service';
import {
  ClockifyUserSchema,
  HistoricalTarget,
} from '../../../shared/schemas/app.schemas';

@Injectable({
  providedIn: 'root',
})
export class SettingsStateService {
  private readonly clockifyService = inject(ClockifyService);
  private readonly historicalDataService = inject(HistoricalDataService);
  private readonly projectService = inject(ProjectService);
  private readonly settingsService = inject(SettingsService);

  // Pure business logic functions returning Observables for the component to handle.
  fetchUserId(apiKey: string): Observable<string> {
    return this.clockifyService.getCurrentUserId(apiKey).pipe(
      map((response) => {
        const user = ClockifyUserSchema.parse(response);
        return user.id;
      }),
    );
  }

  testEmail(): Observable<unknown> {
    return this.settingsService.runWeeklySummary();
  }

  runBackfill(
    historicalTargets: HistoricalTarget[],
  ): Observable<{ message: string }> {
    return this.historicalDataService.backfillHistory(historicalTargets);
  }
}
