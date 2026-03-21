import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { catchError } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { SuggestionsService } from './services/suggestions.service';

@Component({
  selector: 'app-suggestions',
  imports: [MatListModule, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './suggestions.html',
  styleUrl: './suggestions.scss',
})
export class SuggestionsComponent {
  private readonly suggestionsService = inject(SuggestionsService);

  readonly suggestions = toSignal(
    this.suggestionsService.getSuggestions().pipe(
      catchError((err) => {
        console.error('Error fetching suggestions:', err);
        return of([]);
      }),
    ),
  );
}
