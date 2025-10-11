import {
  Component,
  OnInit,
  inject,
  signal,
  ChangeDetectionStrategy,
  effect,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { ClockifyService } from '../../core/services/clockify.service';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { SettingsService } from '../../core/services/settings.service';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HistoricalDataService } from '../../core/services/historical-data.service';
import { AppStateService } from '../../core/state/app.state';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule,
    MatSlideToggleModule,
    MatCardModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Settings implements OnInit {
  private fb = inject(FormBuilder);
  private clockifyService = inject(ClockifyService);
  private settingsService = inject(SettingsService);
  private historicalDataService = inject(HistoricalDataService);
  private notificationService = inject(NotificationService);
  private state = inject(AppStateService);

  form: FormGroup;
  isBackfilling = signal(false);
  isTestingEmail = signal(false);

  constructor() {
    this.form = this.fb.group({
      apiKey: ['', Validators.required],
      workspaceId: ['', Validators.required],
      userId: ['', Validators.required],
      notificationEmail: ['', [Validators.email]],
      enableEmailNotifications: [false],
    });

    // React to changes in the global state and patch the form
    effect(() => {
      const settings = this.state.settings();
      if (settings) {
        this.form.patchValue(settings, { emitEvent: false });
      }
    });
  }

  ngOnInit() {
    // Initial load of settings
    if (!this.state.settings()) {
      this.settingsService.getSettings().subscribe();
    }
  }

  onSubmit() {
    if (this.form.valid) {
      this.settingsService.saveSettings(this.form.value).subscribe();
    }
  }

  fetchUserId() {
    const apiKey = this.form.get('apiKey')?.value;
    if (!apiKey) {
      this.notificationService.showError(
        'Please enter your Clockify API Key first.'
      );
      return;
    }

    this.clockifyService.getCurrentUserId(apiKey).subscribe({
      next: (user: any) => {
        if (user && user.id) {
          this.form.patchValue({ userId: user.id });
          this.notificationService.showSuccess('User ID fetched successfully!');
        } else {
          this.notificationService.showError(
            'Could not fetch User ID. Check your API Key.'
          );
        }
      },
    });
  }

  onBackfillHistory() {
    this.isBackfilling.set(true);
    this.historicalDataService.backfillHistory().subscribe({
      next: (response: any) => {
        this.notificationService.showSuccess(response.message);
        this.isBackfilling.set(false);
      },
      error: () => this.isBackfilling.set(false),
    });
  }

  onTestEmail() {
    this.isTestingEmail.set(true);
    this.settingsService.runWeeklySummary().subscribe({
      next: () => {
        this.notificationService.showSuccess(
          'Weekly summary function ran successfully. Check your email!'
        );
        this.isTestingEmail.set(false);
      },
      error: () => this.isTestingEmail.set(false),
    });
  }
}
