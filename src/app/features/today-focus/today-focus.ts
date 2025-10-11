import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  FocusProject,
  TodayFocusService,
} from '../../core/services/today-focus.service';

@Component({
  selector: 'app-today-focus',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatListModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './today-focus.html',
})
export class TodayFocusComponent implements OnInit {
  private todayFocusService = inject(TodayFocusService);
  focusList: FocusProject[] = [];
  isLoading = true;

  ngOnInit() {
    this.todayFocusService.getTodaysFocus().subscribe({
      next: (data) => {
        this.focusList = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error("Error fetching today's focus:", err);
        this.isLoading = false;
      },
    });
  }
}
