import { Component, effect, inject, OnDestroy } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ThemeService } from './core/services/theme.service';
import { CommonModule } from '@angular/common';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Subscription } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnDestroy {
  title = 'WorkSync';
  themeService = inject(ThemeService);
  private breakpointObserver = inject(BreakpointObserver);
  private handsetSubscription: Subscription;

  isHandset = false; // This boolean will be used in the template

  constructor() {
    // Subscribe to the observable here and update the boolean property
    this.handsetSubscription = this.breakpointObserver
      .observe(Breakpoints.Handset)
      .pipe(map((result) => result.matches))
      .subscribe((matches) => {
        this.isHandset = matches;
      });

    effect(() => {
      if (this.themeService.isDarkTheme()) {
        document.body.classList.add('dark-theme');
        document.body.classList.remove('light-theme');
      } else {
        document.body.classList.add('light-theme');
        document.body.classList.remove('dark-theme');
      }
    });
  }

  ngOnDestroy() {
    // Unsubscribe to prevent memory leaks when the component is destroyed
    this.handsetSubscription.unsubscribe();
  }
}
