import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { DecimalPipe } from '@angular/common';
import { interval, combineLatest, switchMap, catchError, of, map } from 'rxjs';
import {
  takeUntilDestroyed,
  toObservable,
  toSignal,
} from '@angular/core/rxjs-interop';
import { ProjectService } from '../../core/services/project.service';
import { ClockifyService } from '../../core/services/clockify.service';
import { SettingsService } from '../../core/services/settings.service';
import { SuggestionsComponent } from '../suggestions/suggestions';
import { TodayFocusComponent } from '../today-focus/today-focus';
import { Project } from '../../shared/schemas/app.schemas';
import { parseISO8601Duration } from '../../shared/utils/date.utils';

type TimeEntry = {
  projectId: string;
  timeInterval: { duration: string };
};

interface ProjectWithTime extends Project {
  loggedHours: number;
  balance: number;
}

@Component({
  selector: 'app-dashboard',
  imports: [
    MatCardModule,
    MatProgressBarModule,
    SuggestionsComponent,
    TodayFocusComponent,
    DecimalPipe,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  private readonly projectService = inject(ProjectService);
  private readonly clockifyService = inject(ClockifyService);
  private readonly settingsService = inject(SettingsService);

  // Hidden trigger to force a refresh every 2 minutes
  private readonly refreshTrigger = signal(0);

  constructor() {
    // Polls every 2 minutes. Auto-cleans up on destroy!
    interval(120000)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.refreshTrigger.update((v) => v + 1));
  }

  // Purely reactive derivation of projects + time entries
  readonly projects = toSignal(
    combineLatest([
      toObservable(this.settingsService.settings),
      toObservable(this.refreshTrigger),
    ]).pipe(
      switchMap(([settings]) => {
        if (!settings?.apiKey || !settings?.workspaceId || !settings?.userId)
          return of([]);

        const today = new Date();
        const start = new Date(
          today.getFullYear(),
          today.getMonth(),
          1,
        ).toISOString();
        const end = new Date(
          today.getFullYear(),
          today.getMonth() + 1,
          0,
          23,
          59,
          59,
          999,
        ).toISOString();

        return this.projectService.getProjects().pipe(
          switchMap((projects) => {
            if (!projects || projects.length === 0) return of([]);

            return this.clockifyService
              .getTimeEntries(
                settings.apiKey,
                settings.workspaceId,
                settings.userId,
                start,
                end,
              )
              .pipe(
                map((timeEntries: unknown) => {
                  const entries = (timeEntries as TimeEntry[]) || [];

                  return projects.map((p) => {
                    const filteredTimeEntries = entries.filter(
                      (te) =>
                        p.clockify_project_id &&
                        te.projectId === p.clockify_project_id,
                    );
                    const totalDurationSeconds = filteredTimeEntries.reduce(
                      (acc, te) =>
                        acc + parseISO8601Duration(te.timeInterval.duration),
                      0,
                    );
                    const loggedHours = totalDurationSeconds / 3600;

                    return {
                      ...p,
                      loggedHours: Math.round(loggedHours * 100) / 100,
                      balance:
                        Math.round((p.target_hours - loggedHours) * 100) / 100,
                    };
                  });
                }),
              );
          }),
        );
      }),
      catchError((err) => {
        console.error('Error fetching dashboard data:', err);
        return of([]);
      }),
    ),
    { initialValue: [] as ProjectWithTime[] },
  );
}
