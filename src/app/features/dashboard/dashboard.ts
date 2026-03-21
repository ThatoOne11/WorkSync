import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { DecimalPipe } from '@angular/common';
import { interval, combineLatest, switchMap, catchError, of, map } from 'rxjs';
import {
  takeUntilDestroyed,
  toObservable,
  toSignal,
} from '@angular/core/rxjs-interop';
import { SuggestionsComponent } from '../suggestions/suggestions';
import { Project } from '../../shared/schemas/app.schemas';
import { parseISO8601Duration } from '../../shared/utils/date.utils';
import { ClockifyService } from '../../services/clockify.service';
import { ProjectService } from '../../services/project.service';
import { SettingsService } from '../../services/settings.service';

type TimeEntry = {
  projectId: string;
  timeInterval: { duration: string };
};

type ProjectWithTime = Project & {
  loggedHours: number;
  balance: number;
};

@Component({
  selector: 'app-dashboard',
  imports: [
    MatProgressBarModule,
    MatIconModule,
    SuggestionsComponent,
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

  private readonly refreshTrigger = signal(0);

  constructor() {
    interval(120000)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.refreshTrigger.update((v) => v + 1));
  }

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
                    const filtered = entries.filter(
                      (te) =>
                        p.clockify_project_id &&
                        te.projectId === p.clockify_project_id,
                    );
                    const totalSecs = filtered.reduce(
                      (acc, te) =>
                        acc + parseISO8601Duration(te.timeInterval.duration),
                      0,
                    );
                    const loggedHours = totalSecs / 3600;
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
