import {
  ChangeDetectionStrategy,
  Component,
  inject,
  computed,
} from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DecimalPipe } from '@angular/common';
import {
  interval,
  combineLatest,
  switchMap,
  startWith,
  forkJoin,
  of,
  catchError,
} from 'rxjs';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { SuggestionsComponent } from '../suggestions/suggestions';
import { SettingsService } from '../../core/services/settings.service';
import { DashboardService } from './services/dashboard.service';
import { SuggestionsService } from '../suggestions/services/suggestions.service';

@Component({
  selector: 'app-dashboard',
  imports: [
    MatProgressBarModule,
    MatIconModule,
    MatProgressSpinnerModule,
    SuggestionsComponent,
    DecimalPipe,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  private readonly settingsService = inject(SettingsService);
  private readonly dashboardService = inject(DashboardService);
  private readonly suggestionsService = inject(SuggestionsService); // Inject AI here!

  private readonly refreshTrigger$ = interval(120000).pipe(startWith(0));

  // Fetch BOTH pieces of data simultaneously, wait for both to finish
  readonly dashboardData = toSignal(
    combineLatest([
      toObservable(this.settingsService.settings),
      this.refreshTrigger$,
    ]).pipe(
      switchMap(([settings]) => {
        if (!settings?.apiKey || !settings?.workspaceId || !settings?.userId) {
          return of({ projects: [], suggestions: [] });
        }

        return forkJoin({
          projects: this.dashboardService
            .getDashboardProjects(settings)
            .pipe(catchError(() => of([]))),
          suggestions: this.suggestionsService
            .getSuggestions()
            .pipe(catchError(() => of([]))),
        });
      }),
    ),
    { initialValue: undefined },
  );

  // Expose them cleanly to the HTML
  readonly projects = computed(() => this.dashboardData()?.projects);
  readonly suggestions = computed(() => this.dashboardData()?.suggestions);
}
