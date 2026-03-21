import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { catchError, of } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { TodayFocusService } from './services/today-focus.service';
import { isWeekend } from '../../shared/utils/date.utils';

@Component({
  selector: 'app-today-focus',
  imports: [MatListModule, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './today-focus.html',
  styleUrl: './today-focus.scss',
})
export class TodayFocusComponent {
  private readonly todayFocusService = inject(TodayFocusService);

  readonly isWeekend = computed(() => isWeekend());

  readonly focusList = toSignal(
    this.todayFocusService.getTodaysFocus().pipe(
      catchError((err) => {
        console.error("Error fetching today's focus:", err);
        return of([]);
      }),
    ),
  );
}
