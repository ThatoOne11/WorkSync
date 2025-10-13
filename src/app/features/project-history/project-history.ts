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
  @ViewChild('historyChart') chartCanvas!: ElementRef<HTMLCanvasElement>;

  private route = inject(ActivatedRoute);
  private projectHistoryService = inject(ProjectHistoryService);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  isLoading = true;
  chart: Chart | undefined;
  keyMetrics: KeyMetrics | undefined;
  insights: string[] = [];
  projectName = '';

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
    this.chart?.destroy();
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
          this.isLoading = false;
          this.cdr.detectChanges();
          setTimeout(() => this.createChart(data.chartData), 0);
        },
        error: (err) => {
          console.error('Error fetching project history:', err);
          this.isLoading = false;
        },
      });
  }

  private createChart(chartData: any) {
    if (!this.chartCanvas) return;

    const chartConfig: ChartConfiguration = {
      type: 'line',
      data: chartData,
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

    if (this.chart) {
      this.chart.destroy();
    }
    this.chart = new Chart(this.chartCanvas.nativeElement, chartConfig);
  }
}
