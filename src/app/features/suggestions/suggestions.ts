import { Component, OnInit, inject } from '@angular/core';
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
})
export class SuggestionsComponent implements OnInit {
  private suggestionsService = inject(SuggestionsService);
  suggestions: string[] = [];
  isLoading = true;

  ngOnInit() {
    this.suggestionsService.getSuggestions().subscribe({
      next: (data) => {
        this.suggestions = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error fetching suggestions:', err);
        this.isLoading = false;
        // You could set an error message here if you want
      },
    });
  }
}
