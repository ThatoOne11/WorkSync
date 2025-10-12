import {
  Component,
  OnInit,
  inject,
  Input,
  ViewChild,
  ElementRef,
  AfterViewInit,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Chart } from 'chart.js/auto';
import {
  HistoricalDataService,
  WeeklySummary,
} from '../../core/services/historical-data.service';
import { Project } from '../../core/models/project.model';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-project-history',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatIconModule,
  ],
  templateUrl: './project-history.html',
})
export class ProjectHistory implements OnInit {
  @ViewChild('historyChart') chartCanvas!: ElementRef<HTMLCanvasElement>;

  private historicalDataService = inject(HistoricalDataService);
  private cdr = inject(ChangeDetectorRef); // Inject ChangeDetectorRef

  summaries: WeeklySummary[] = [];
  isLoading = true;
  chart: Chart | undefined;

  public data: { project: Project } = inject(MAT_DIALOG_DATA);
  project: Project = this.data.project;

  ngOnInit() {
    this.historicalDataService
      .getWeeklySummaries(this.project.id)
      .subscribe((summaries) => {
        this.summaries = summaries;
        this.isLoading = false;

        // --- THIS IS THE KEY FIX ---
        // We must force change detection and then create the chart in the next tick
        // to ensure the <canvas> element is rendered and available.
        this.cdr.detectChanges();
        setTimeout(() => this.createChart(), 0);
        // --- END OF FIX ---
      });
  }

  createChart() {
    // Simplified check: only needs the canvas to be ready.
    if (!this.chartCanvas || this.summaries.length === 0) {
      return;
    }

    const labels = this.summaries.map((s) => s.week_ending_on);
    const allocatedHoursData = this.summaries.map((s) => s.target_hours);
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
            borderColor: 'red', // Accent color
            backgroundColor: 'rgba(255, 64, 129, 0.2)',
            fill: true,
            tension: 0.1,
          },
          {
            label: 'Allocated Hours',
            data: allocatedHoursData,
            borderColor: 'black', // A neutral grey
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
