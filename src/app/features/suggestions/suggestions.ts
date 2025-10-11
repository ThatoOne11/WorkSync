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
import { SuggestionsService } from '../../core/services/suggestions.service';

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
export class SuggestionsComponent implements OnInit {
  private suggestionsService = inject(SuggestionsService);
  suggestions = signal<string[]>([]);
  isLoading = signal(true);

  ngOnInit() {
    this.suggestionsService.getSuggestions().subscribe({
      next: (data) => {
        this.suggestions.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }
}
