import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  viewChild,
  OnDestroy,
  computed,
} from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Chart, ChartConfiguration, ChartData } from 'chart.js/auto';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { switchMap, map, catchError, of } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { DecimalPipe } from '@angular/common';
import { ProjectHistoryService } from './services/project-history.service';
import { HistoryViewHelper } from './helpers/history-view.helper';
import { HistoryPayload } from '../../shared/schemas/app.schemas';

@Component({
  selector: 'app-project-history',
  imports: [RouterModule, MatProgressSpinnerModule, MatIconModule, DecimalPipe],
  templateUrl: './project-history.html',
  styleUrls: ['./project-history.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectHistory implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly projectHistoryService = inject(ProjectHistoryService);

  readonly weeklyChartCanvas =
    viewChild<import('@angular/core').ElementRef<HTMLCanvasElement>>(
      'weeklyChart',
    );
  readonly monthlyChartCanvas =
    viewChild<import('@angular/core').ElementRef<HTMLCanvasElement>>(
      'monthlyChart',
    );

  private weeklyChartInstance: Chart | undefined;
  private monthlyChartInstance: Chart | undefined;
  readonly projectData = toSignal<HistoryPayload | null>(
    this.route.paramMap.pipe(
      switchMap((params) => {
        const projectId = Number(params.get('id'));
        if (!projectId) return of(null);
        return this.projectHistoryService.getProjectHistory(projectId).pipe(
          map((res) => res as HistoryPayload),
          catchError(() => of(null)),
        );
      }),
    ),
    { initialValue: null },
  );

  readonly monthlyDataForTable = computed(() => {
    return HistoryViewHelper.extractTableRowsFromChartData(this.projectData());
  });

  constructor() {
    effect(() => {
      const data = this.projectData();
      const wCanvas = this.weeklyChartCanvas();
      const mCanvas = this.monthlyChartCanvas();

      if (data && wCanvas && mCanvas) {
        this.createWeeklyChart(
          wCanvas.nativeElement,
          data.chartData as unknown as ChartData<'line'>,
        );
        this.createMonthlyChart(
          mCanvas.nativeElement,
          data.monthlyChartData as unknown as ChartData<'bar'>,
        );
      }
    });
  }

  ngOnDestroy() {
    this.weeklyChartInstance?.destroy();
    this.monthlyChartInstance?.destroy();
  }

  private createWeeklyChart(
    canvas: HTMLCanvasElement,
    chartData: ChartData<'line'>,
  ) {
    if (this.weeklyChartInstance) this.weeklyChartInstance.destroy();
    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { tooltip: { mode: 'index', intersect: false } },
      },
    };
    this.weeklyChartInstance = new Chart<'line'>(canvas, config);
  }

  private createMonthlyChart(
    canvas: HTMLCanvasElement,
    chartData: ChartData<'bar'>,
  ) {
    if (this.monthlyChartInstance) this.monthlyChartInstance.destroy();
    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { x: { grid: { display: false } } },
      },
    };
    this.monthlyChartInstance = new Chart<'bar'>(canvas, config);
  }
}
