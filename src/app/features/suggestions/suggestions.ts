import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SuggestionsService } from '../../core/services/suggestions.service';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-suggestions',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatListModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './suggestions.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuggestionsComponent {
  private suggestionsService = inject(SuggestionsService);
  protected suggestions$: Observable<string[]>;

  constructor() {
    this.suggestions$ = this.suggestionsService.getSuggestions().pipe(
      catchError((err) => {
        console.error('Error fetching suggestions:', err);
        // On error, return an empty array to prevent the UI from breaking
        return of([]);
      })
    );
  }
}
