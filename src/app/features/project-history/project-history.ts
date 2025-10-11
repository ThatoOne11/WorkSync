import {
  Component,
  OnInit,
  inject,
  Input,
  ViewChild,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Chart } from 'chart.js/auto';
import {
  HistoricalDataService,
  WeeklySummary,
} from '../../core/services/historical-data.service';
import { Project } from '../../core/models/project.model';

@Component({
  selector: 'app-project-history',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatTableModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './project-history.html',
})
export class ProjectHistory implements OnInit, AfterViewInit {
  @Input() project?: Project;
  @ViewChild('historyChart') chartCanvas!: ElementRef<HTMLCanvasElement>;

  private historicalDataService = inject(HistoricalDataService);
  summaries: WeeklySummary[] = [];
  isLoading = true;
  chart: Chart | undefined;

  // Inject dialog data
  public data: { project: Project } = inject(MAT_DIALOG_DATA);

  ngOnInit() {
    this.project = this.data.project;
    if (this.project) {
      this.historicalDataService
        .getWeeklySummaries(this.project.id)
        .subscribe((summaries) => {
          this.summaries = summaries;
          this.isLoading = false;
          this.createChart();
        });
    }
  }

  ngAfterViewInit() {
    this.createChart();
  }

  createChart() {
    if (!this.chartCanvas || this.summaries.length === 0) {
      return;
    }

    const labels = this.summaries.map((s) => s.week_ending_on);
    const targetHoursData = this.summaries.map((s) => s.target_hours);
    const loggedHoursData = this.summaries.map((s) => s.logged_hours);

    if (this.chart) {
      this.chart.destroy();
    }

    this.chart = new Chart(this.chartCanvas.nativeElement, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Logged Hours',
            data: loggedHoursData,
            borderColor: '#3f51b5', // primary color
            tension: 0.1,
          },
          {
            label: 'Target Hours',
            data: targetHoursData,
            borderColor: '#ff4081', // accent color
            borderDash: [5, 5],
            tension: 0.1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
      },
    });
  }
}
