import { Injectable, inject, computed } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
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

  // 1. Declarative, pure derived state. Automatically updates when settings change.
  readonly activeProjects = toSignal(
    toObservable(this.settingsService.settings).pipe(
      switchMap((settings) =>
        settings ? this.projectService.getProjects() : of([]),
      ),
      catchError(() => of([])),
    ),
    { initialValue: [] },
  );

  readonly hasActiveProjects = computed(() => this.activeProjects().length > 0);

  // 2. Pure business logic functions returning Observables for the component to handle.
  fetchUserId(apiKey: string): Observable<string> {
    return this.clockifyService.getCurrentUserId(apiKey).pipe(
      map((response) => {
        // STRICT ZOD BOUNDARY
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
