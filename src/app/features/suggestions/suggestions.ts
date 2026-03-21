import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-suggestions',
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './suggestions.html',
  styleUrl: './suggestions.scss',
})
export class SuggestionsComponent {
  suggestions = input<string[] | undefined>(undefined);
}
