import { Injectable, inject } from '@angular/core';
import { Observable, of, combineLatest } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { ProjectService } from '../../projects/services/project.service';
import { ClockifyService } from '../../../core/services/clockify.service';
import {
  AppSettings,
  ProjectWithTime,
} from '../../../shared/schemas/app.schemas';
import { parseISO8601Duration } from '../../../shared/utils/date.utils';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private readonly projectService = inject(ProjectService);
  private readonly clockifyService = inject(ClockifyService);

  getDashboardProjects(
    settings: AppSettings | null,
  ): Observable<ProjectWithTime[]> {
    if (!settings?.apiKey || !settings?.workspaceId || !settings?.userId) {
      return of([]);
    }

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
            map((entries) => {
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
      catchError((err) => {
        console.error('Error fetching dashboard data:', err);
        return of([]);
      }),
    );
  }
}
