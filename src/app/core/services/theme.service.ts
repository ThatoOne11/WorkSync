import { Injectable, signal, effect } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  isDarkTheme = signal(false);

  constructor() {
    const storedPreference = localStorage.getItem('theme');
    if (storedPreference) {
      this.isDarkTheme.set(storedPreference === 'dark');
    } else {
      this.isDarkTheme.set(
        window.matchMedia('(prefers-color-scheme: dark)').matches
      );
    }

    effect(() => {
      localStorage.setItem('theme', this.isDarkTheme() ? 'dark' : 'light');
    });
  }

  toggleTheme() {
    this.isDarkTheme.update((value) => !value);
  }
}
