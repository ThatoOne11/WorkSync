import { Injectable, signal, effect } from '@angular/core';
import { STORAGE_CONSTANTS } from '../../shared/constants/storage.constants';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  readonly isDarkTheme = signal(false);

  constructor() {
    const storedPreference = localStorage.getItem(STORAGE_CONSTANTS.THEME_KEY);

    if (storedPreference) {
      this.isDarkTheme.set(storedPreference === 'dark');
    } else {
      this.isDarkTheme.set(
        window.matchMedia('(prefers-color-scheme: dark)').matches,
      );
    }

    // Automatically syncs to localStorage whenever the signal changes
    effect(() => {
      localStorage.setItem(
        STORAGE_CONSTANTS.THEME_KEY,
        this.isDarkTheme() ? 'dark' : 'light',
      );
    });
  }

  toggleTheme(): void {
    this.isDarkTheme.update((value) => !value);
  }
}
