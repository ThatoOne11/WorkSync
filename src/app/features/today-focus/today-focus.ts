import {
  Component,
  OnInit,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TodayFocusComponent implements OnInit {
  private todayFocusService = inject(TodayFocusService);
  focusList = signal<FocusProject[]>([]);
  isLoading = signal(true);

  ngOnInit() {
    this.todayFocusService.getTodaysFocus().subscribe({
      next: (data) => {
        this.focusList.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }
}
