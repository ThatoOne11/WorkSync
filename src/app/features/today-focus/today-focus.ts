import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { catchError } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { TodayFocusService } from '../../services/today-focus.service';

@Component({
  selector: 'app-today-focus',
  imports: [MatListModule, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './today-focus.html',
})
export class TodayFocusComponent {
  private readonly todayFocusService = inject(TodayFocusService);

  readonly isWeekend = computed(() => {
    const day = new Date().getDay();
    return day === 0 || day === 6;
  });

  readonly focusList = toSignal(
    this.todayFocusService.getTodaysFocus().pipe(
      catchError((err) => {
        console.error("Error fetching today's focus:", err);
        return of([]);
      }),
    ),
  );
}
