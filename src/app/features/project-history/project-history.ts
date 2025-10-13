import {
  Component,
  OnInit,
  inject,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Chart, ChartConfiguration } from 'chart.js/auto';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ProjectHistoryService } from '../../core/services/project-history.service';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';

interface KeyMetrics {
  totalLoggedHours: number;
  targetHours: number;
  averageWeeklyBurn: number;
  pacingVariance: number;
  mostProductiveWeek: {
    logged_hours: number;
    week_ending_on: string;
  };
}

@Component({
  selector: 'app-project-history',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatIconModule,
    MatListModule,
  ],
  templateUrl: './project-history.html',
  styleUrls: ['./project-history.scss'],
})
export class ProjectHistory implements OnInit, OnDestroy {
  @ViewChild('weeklyChart') weeklyChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('monthlyChart') monthlyChartCanvas!: ElementRef<HTMLCanvasElement>;

  private route = inject(ActivatedRoute);
  private projectHistoryService = inject(ProjectHistoryService);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  isLoading = true;
  keyMetrics: KeyMetrics | undefined;
  insights: string[] = [];
  projectName = '';
  weeklyChart: Chart | undefined;
  monthlyChart: Chart | undefined;
  monthlyDataForTable: any[] = [];

  ngOnInit() {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const projectId = Number(params.get('id'));
      if (projectId) {
        this.loadHistory(projectId);
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.weeklyChart?.destroy();
    this.monthlyChart?.destroy();
  }

  private loadHistory(projectId: number): void {
    this.isLoading = true;
    this.projectHistoryService
      .getProjectHistory(projectId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          this.projectName = data.projectName;
          this.keyMetrics = data.keyMetrics;
          this.insights = data.insights;
          this.prepareMonthlyTableData(data.monthlyChartData);
          this.isLoading = false;
          this.cdr.detectChanges();
          setTimeout(() => {
            // --- FIX: Use the correct property 'chartData' ---
            this.createWeeklyChart(data.chartData);
            this.createMonthlyChart(data.monthlyChartData);
          }, 0);
        },
        error: (err) => {
          console.error('Error fetching project history:', err);
          this.isLoading = false;
        },
      });
  }

  private prepareMonthlyTableData(monthlyChartData: any) {
    if (!monthlyChartData || !monthlyChartData.labels) {
      this.monthlyDataForTable = [];
      return;
    }
    this.monthlyDataForTable = monthlyChartData.labels.map(
      (label: string, index: number) => {
        const logged = monthlyChartData.datasets[0].data[index];
        const target = monthlyChartData.datasets[1].data[index];
        return {
          month: label,
          target: target,
          logged: logged,
          variance: logged - target,
        };
      }
    );
  }

  private createWeeklyChart(chartData: any) {
    if (!this.weeklyChartCanvas) return;

    const chartConfig: ChartConfiguration = {
      type: 'line',
      data: chartData, // This is now correct
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
          },
          tooltip: {
            mode: 'index',
            intersect: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Hours',
            },
          },
        },
      },
    };

    if (this.weeklyChart) {
      this.weeklyChart.destroy();
    }
    this.weeklyChart = new Chart(
      this.weeklyChartCanvas.nativeElement,
      chartConfig
    );
  }

  private createMonthlyChart(chartData: any) {
    if (!this.monthlyChartCanvas) return;

    const chartConfig: ChartConfiguration = {
      type: 'bar',
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, title: { display: true, text: 'Hours' } },
          x: { grid: { display: false } },
        },
      },
    };

    if (this.monthlyChart) {
      this.monthlyChart.destroy();
    }
    this.monthlyChart = new Chart(
      this.monthlyChartCanvas.nativeElement,
      chartConfig
    );
  }
}
