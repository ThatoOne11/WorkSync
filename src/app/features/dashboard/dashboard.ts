import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Subscription, interval } from 'rxjs';
import { Project } from '../../core/models/project.model';
import { AppStateService } from '../../core/state/app.state';
import { ClockifyService } from '../../core/services/clockify.service';
import { SettingsService } from '../../core/services/settings.service';
import { SuggestionsComponent } from '../suggestions/suggestions';
import { TodayFocusComponent } from '../today-focus/today-focus';

interface TimeEntry {
  projectId: string;
  timeInterval: {
    duration: string;
  };
}

interface ProjectWithTime extends Project {
  loggedHours: number;
  balance: number;
}

function parseISO8601Duration(duration: string): number {
  if (!duration) return 0;
  const regex = /P(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)/;
  const matches = duration.match(regex);
  if (!matches) return 0;
  const hours = parseFloat(matches[1] || '0');
  const minutes = parseFloat(matches[2] || '0');
  const seconds = parseFloat(matches[3] || '0');
  return hours * 3600 + minutes * 60 + seconds;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatProgressBarModule,
    SuggestionsComponent,
    TodayFocusComponent,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard implements OnInit, OnDestroy {
  private state = inject(AppStateService);
  private clockifyService = inject(ClockifyService);
  private settingsService = inject(SettingsService);

  projects = signal<ProjectWithTime[]>([]);
  private pollingSubscription?: Subscription;

  ngOnInit() {
    this.loadData();

    this.pollingSubscription = interval(120000).subscribe(() => {
      this.loadData();
    });
  }

  ngOnDestroy() {
    this.pollingSubscription?.unsubscribe();
  }

  loadData() {
    const settings = this.state.settings();
    if (
      settings &&
      settings.apiKey &&
      settings.workspaceId &&
      settings.userId
    ) {
      this.fetchProjectsAndEntries(settings);
    } else {
      // Fetch settings if not available in state
      this.settingsService.getSettings().subscribe((settings) => {
        if (
          settings &&
          settings.apiKey &&
          settings.workspaceId &&
          settings.userId
        ) {
          this.fetchProjectsAndEntries(settings);
        }
      });
    }
  }

  fetchProjectsAndEntries(settings: any) {
    const today = new Date();
    const startOfMonth = new Date(
      today.getFullYear(),
      today.getMonth(),
      1
    ).toISOString();
    const endOfMonth = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      0
    ).toISOString();

    const currentProjects = this.state.projects();

    if (currentProjects.length === 0) {
      this.projects.set([]);
      return;
    }

    this.clockifyService
      .getTimeEntries(
        settings.apiKey,
        settings.workspaceId,
        settings.userId,
        startOfMonth,
        endOfMonth
      )
      .subscribe((timeEntries: TimeEntry[] | null) => {
        const entries = timeEntries ?? [];
        const projectsWithTime: ProjectWithTime[] = currentProjects.map((p) => {
          const filteredEntries = entries.filter(
            (te) =>
              p.clockify_project_id && te.projectId === p.clockify_project_id
          );
          const totalDurationSeconds = filteredEntries.reduce(
            (acc, te) => acc + parseISO8601Duration(te.timeInterval.duration),
            0
          );
          const loggedHours = totalDurationSeconds / 3600;

          return {
            ...p,
            loggedHours: Math.round(loggedHours * 100) / 100,
            balance: Math.round((p.target_hours - loggedHours) * 100) / 100,
          };
        });
        this.projects.set(projectsWithTime);
      });
  }
}
