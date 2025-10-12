import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  FocusProject,
  TodayFocusService,
} from '../../core/services/today-focus.service';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

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
export class TodayFocusComponent {
  private todayFocusService = inject(TodayFocusService);
  protected focusList$: Observable<FocusProject[]>;

  // helper to check if today is a weekend
  protected isWeekend(): boolean {
    const day = new Date().getDay();
    return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
  }

  constructor() {
    this.focusList$ = this.todayFocusService.getTodaysFocus().pipe(
      catchError((err) => {
        console.error("Error fetching today's focus:", err);
        return of([]);
      })
    );
  }
}
