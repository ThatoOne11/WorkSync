import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  viewChild,
  OnDestroy,
} from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Chart, ChartConfiguration } from 'chart.js/auto';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { switchMap, map, catchError, of } from 'rxjs';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { ProjectHistoryService } from '../../core/services/project-history.service';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

// Define the interface so strict mode knows what properties exist in the template
export interface HistoryPayload {
  projectName: string;
  keyMetrics: {
    totalLoggedHours: number;
    targetHours: number;
    averageWeeklyBurn: number;
    pacingVariance: number;
    mostProductiveWeek: {
      logged_hours: number;
      week_ending_on: string;
    };
  };
  chartData: any;
  monthlyChartData: any;
  insights: string[];
}

@Component({
  selector: 'app-project-history',
  imports: [
    RouterModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatIconModule,
  ],
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

  // Explicitly type the signal to HistoryPayload | null
  readonly projectData = toSignal<HistoryPayload | null>(
    this.route.paramMap.pipe(
      switchMap((params) => {
        const projectId = Number(params.get('id'));
        if (!projectId) return of(null);
        return this.projectHistoryService.getProjectHistory(projectId).pipe(
          map((res) => res as HistoryPayload), // Cast the unknown response to our interface
          catchError(() => of(null)),
        );
      }),
    ),
    { initialValue: null },
  );

  readonly monthlyDataForTable = toSignal(
    toObservable(this.projectData).pipe(
      map((data) => {
        if (!data?.monthlyChartData?.labels) return [];
        return data.monthlyChartData.labels.map(
          (label: string, index: number) => ({
            month: label,
            target: data.monthlyChartData.datasets[1].data[index],
            logged: data.monthlyChartData.datasets[0].data[index],
            variance:
              data.monthlyChartData.datasets[0].data[index] -
              data.monthlyChartData.datasets[1].data[index],
          }),
        );
      }),
    ),
    { initialValue: [] as any[] },
  );

  constructor() {
    effect(() => {
      const data = this.projectData();
      const wCanvas = this.weeklyChartCanvas();
      const mCanvas = this.monthlyChartCanvas();

      if (data && wCanvas && mCanvas) {
        this.createWeeklyChart(wCanvas.nativeElement, data.chartData);
        this.createMonthlyChart(mCanvas.nativeElement, data.monthlyChartData);
      }
    });
  }

  ngOnDestroy() {
    this.weeklyChartInstance?.destroy();
    this.monthlyChartInstance?.destroy();
  }

  private createWeeklyChart(canvas: HTMLCanvasElement, chartData: any) {
    if (this.weeklyChartInstance) this.weeklyChartInstance.destroy();
    const config: ChartConfiguration = {
      type: 'line',
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { tooltip: { mode: 'index', intersect: false } },
      },
    };
    this.weeklyChartInstance = new Chart(canvas, config);
  }

  private createMonthlyChart(canvas: HTMLCanvasElement, chartData: any) {
    if (this.monthlyChartInstance) this.monthlyChartInstance.destroy();
    const config: ChartConfiguration = {
      type: 'bar',
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { x: { grid: { display: false } } },
      },
    };
    this.monthlyChartInstance = new Chart(canvas, config);
  }
}
