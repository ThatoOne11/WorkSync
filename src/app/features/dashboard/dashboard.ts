import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { DecimalPipe } from '@angular/common';
import { interval, combineLatest, switchMap, startWith } from 'rxjs';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { SuggestionsComponent } from '../suggestions/suggestions';
import { SettingsService } from '../../core/services/settings.service';
import { DashboardService } from './services/dashboard.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-dashboard',
  imports: [
    MatProgressBarModule,
    MatIconModule,
    SuggestionsComponent,
    MatProgressSpinnerModule,
    DecimalPipe,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  private readonly settingsService = inject(SettingsService);
  private readonly dashboardService = inject(DashboardService);

  private readonly refreshTrigger$ = interval(120000).pipe(startWith(0));

  readonly projects = toSignal(
    combineLatest([
      toObservable(this.settingsService.settings),
      this.refreshTrigger$,
    ]).pipe(
      switchMap(([settings]) =>
        this.dashboardService.getDashboardProjects(settings),
      ),
    ),
    { initialValue: undefined },
  );
}
