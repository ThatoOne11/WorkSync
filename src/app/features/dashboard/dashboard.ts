import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { ProjectService } from '../../core/services/project.service';
import { ClockifyService } from '../../core/services/clockify.service';
import { Project } from '../../core/models/project.model';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatGridListModule } from '@angular/material/grid-list';
import {
  SettingsService,
  AppSettings,
} from '../../core/services/settings.service';
import { Subscription, interval } from 'rxjs'; // Import Subscription and interval
import { SuggestionsComponent } from '../suggestions/suggestions';

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

// Helper function to parse ISO 8601 duration
function parseISO8601Duration(duration: string): number {
  const regex = /P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const matches = duration.match(regex);

  if (!matches) {
    return 0;
  }

  const days = parseInt(matches[1] || '0', 10);
  const hours = parseInt(matches[2] || '0', 10);
  const minutes = parseInt(matches[3] || '0', 10);
  const seconds = parseInt(matches[4] || '0', 10);

  return days * 24 * 3600 + hours * 3600 + minutes * 60 + seconds;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatGridListModule,
    SuggestionsComponent,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit, OnDestroy {
  // Implement OnDestroy
  private projectService = inject(ProjectService);
  private clockifyService = inject(ClockifyService);
  private settingsService = inject(SettingsService);

  projects = signal<ProjectWithTime[]>([]);
  private pollingSubscription?: Subscription; // To hold the interval subscription

  ngOnInit() {
    this.loadData(); // Load data immediately on component load

    // --- THIS IS THE KEY CHANGE: Set up polling every 2 minutes ---
    // 120000 milliseconds = 2 minutes
    this.pollingSubscription = interval(120000).subscribe(() => {
      console.log('Polling for new Clockify data...');
      this.loadData();
    });
    // --- END OF CHANGE ---
  }

  ngOnDestroy() {
    // --- THIS IS THE KEY CHANGE: Clean up the subscription to prevent memory leaks ---
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
    }
    // --- END OF CHANGE ---
  }

  loadData() {
    this.settingsService.getSettings().subscribe((settings) => {
      if (
        settings &&
        settings.apiKey &&
        settings.workspaceId &&
        settings.userId
      ) {
        this.fetchProjectsAndEntries(settings);
      } else {
        console.log('Dashboard: Settings are not fully configured.');
        this.projects.set([]);
      }
    });
  }

  fetchProjectsAndEntries(settings: AppSettings) {
    // Calculate start and end of the CURRENT MONTH
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);

    const start = startOfMonth.toISOString();
    const end = endOfMonth.toISOString();

    this.projectService.getProjects().subscribe((projects) => {
      if (!projects || projects.length === 0) {
        this.projects.set([]);
        return;
      }

      this.clockifyService
        .getTimeEntries(
          settings.apiKey,
          settings.workspaceId,
          settings.userId,
          start,
          end
        )
        .subscribe((timeEntries: TimeEntry[]) => {
          if (!timeEntries) {
            timeEntries = [];
          }

          const projectsWithTime: ProjectWithTime[] = projects.map((p) => {
            const filteredTimeEntries = timeEntries.filter(
              (te) =>
                p.clockify_project_id && te.projectId === p.clockify_project_id
            );
            const totalDurationSeconds = filteredTimeEntries.reduce(
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
    });
  }
}
