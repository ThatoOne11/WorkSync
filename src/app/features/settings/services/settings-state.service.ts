import { Injectable, inject, signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HistoricalDataService } from '../../project-history/services/historical-data.service';
import { ProjectService } from '../../projects/services/project.service';
import { SettingsService } from '../../../core/services/settings.service';
import {
  ClockifyUserSchema,
  Project,
  HistoricalTarget,
} from '../../../shared/schemas/app.schemas';
import { ClockifyService } from '../../../core/services/clockify.service';

@Injectable({
  providedIn: 'root',
})
export class SettingsStateService {
  private readonly clockifyService = inject(ClockifyService);
  private readonly historicalDataService = inject(HistoricalDataService);
  private readonly projectService = inject(ProjectService);
  private readonly settingsService = inject(SettingsService);
  private readonly snackBar = inject(MatSnackBar);

  // Read-only Signals for UI state
  readonly isFetchingUserId = signal(false);
  readonly isTestingEmail = signal(false);
  readonly isBackfilling = signal(false);
  readonly hasActiveProjects = signal(false);
  readonly activeProjects = signal<Project[]>([]);

  checkActiveProjects(): void {
    const settings = this.settingsService.settings();
    if (settings) {
      this.projectService.getProjects().subscribe({
        next: (projects) => {
          this.activeProjects.set(projects || []);
          this.hasActiveProjects.set(projects && projects.length > 0);
        },
        error: () => {
          this.activeProjects.set([]);
          this.hasActiveProjects.set(false);
        },
      });
    } else {
      this.activeProjects.set([]);
      this.hasActiveProjects.set(false);
    }
  }

  async fetchUserId(
    apiKey: string,
    workspaceId: string,
  ): Promise<string | null> {
    this.isFetchingUserId.set(true);

    return new Promise((resolve) => {
      this.clockifyService.getCurrentUserId(apiKey).subscribe({
        next: (response: unknown) => {
          try {
            // STRICT ZOD BOUNDARY: Parsing external data before it hits the UI
            const user = ClockifyUserSchema.parse(response);
            this.snackBar.open('User ID fetched successfully!', 'Close', {
              duration: 3000,
            });
            resolve(user.id);
          } catch (e) {
            this.snackBar.open(
              'Could not fetch User ID. Check your API Key.',
              'Close',
              { duration: 3000 },
            );
            resolve(null);
          }
          this.isFetchingUserId.set(false);
        },
        error: (err) => {
          console.error('Error fetching user ID:', err);
          this.snackBar.open(
            'Error fetching User ID. Check the console.',
            'Close',
            { duration: 3000 },
          );
          this.isFetchingUserId.set(false);
          resolve(null);
        },
      });
    });
  }

  testEmail(): void {
    this.isTestingEmail.set(true);
    this.settingsService.runWeeklySummary().subscribe({
      next: () => {
        this.snackBar.open(
          'Weekly summary function ran successfully. Check your email!',
          'Close',
          { duration: 5000 },
        );
        this.isTestingEmail.set(false);
      },
      error: (err) => {
        console.error('Error running weekly summary:', err);
        this.snackBar.open(
          'An error occurred. Please check the console.',
          'Close',
          { duration: 5000 },
        );
        this.isTestingEmail.set(false);
      },
    });
  }

  runBackfill(historicalTargets: HistoricalTarget[]): void {
    this.isBackfilling.set(true);
    this.historicalDataService.backfillHistory(historicalTargets).subscribe({
      next: (response: any) => {
        this.snackBar.open(response.message, 'Close', { duration: 5000 });
        this.isBackfilling.set(false);
      },
      error: (err) => {
        console.error('Error during backfill:', err);
        this.snackBar.open(
          'An error occurred during backfill. Check the console.',
          'Close',
          { duration: 5000 },
        );
        this.isBackfilling.set(false);
      },
    });
  }
}
