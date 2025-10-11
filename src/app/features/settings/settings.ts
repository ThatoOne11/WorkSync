import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
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
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SettingsService } from '../../core/services/settings.service';
import { MatSlideToggleModule } from '@angular/material/slide-toggle'; // Import slide toggle
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HistoricalDataService } from '../../core/services/historical-data.service';

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
})
export class Settings implements OnInit {
  form: FormGroup;
  private clockifyService = inject(ClockifyService);
  private settingsService = inject(SettingsService);
  private historicalDataService = inject(HistoricalDataService);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);

  isBackfilling = false;
  isTestingEmail = false;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      apiKey: ['', Validators.required],
      workspaceId: ['', Validators.required],
      userId: ['', Validators.required],
      notificationEmail: ['', [Validators.email]], // Add email field
      enableEmailNotifications: [false], // Add toggle field
    });
  }

  ngOnInit() {
    this.settingsService.getSettings().subscribe((settings) => {
      if (settings) {
        // --- THIS IS THE KEY FIX ---
        // Use setTimeout to schedule the form update for the next change detection cycle.
        setTimeout(() => {
          this.form.patchValue(settings);
        }, 0);
        // --- END OF FIX ---
      }
    });
  }

  onSubmit() {
    if (this.form.valid) {
      this.settingsService.saveSettings(this.form.value).subscribe(() => {
        this.snackBar.open('Settings saved!', 'Close', { duration: 3000 });
      });
    }
  }

  fetchUserId() {
    const apiKey = this.form.get('apiKey')?.value;
    if (!apiKey) {
      this.snackBar.open('Please enter your Clockify API Key first.', 'Close', {
        duration: 3000,
      });
      return;
    }

    this.clockifyService.getCurrentUserId(apiKey).subscribe({
      next: (user: any) => {
        if (user && user.id) {
          this.form.patchValue({ userId: user.id });
          this.snackBar.open('User ID fetched successfully!', 'Close', {
            duration: 3000,
          });
        } else {
          this.snackBar.open(
            'Could not fetch User ID. Check your API Key.',
            'Close',
            { duration: 3000 }
          );
        }
      },
      error: (err) => {
        console.error('Error fetching user ID:', err);
        this.snackBar.open(
          'Error fetching User ID. Check console for details.',
          'Close',
          { duration: 3000 }
        );
      },
    });
  }

  onBackfillHistory() {
    this.isBackfilling = true;
    this.historicalDataService.backfillHistory().subscribe({
      next: (response: any) => {
        this.snackBar.open(response.message, 'Close', { duration: 5000 });
        this.isBackfilling = false;
      },
      error: (err) => {
        console.error('Error during backfill:', err);
        this.snackBar.open(
          'An error occurred during backfill. Check console.',
          'Close',
          { duration: 5000 }
        );
        this.isBackfilling = false;
      },
    });
  }

  // --- ADD THIS NEW FUNCTION ---
  onTestEmail() {
    this.isTestingEmail = true;
    this.settingsService.runWeeklySummary().subscribe({
      next: (response: any) => {
        this.snackBar.open(
          'Weekly summary function ran successfully. Check your email!',
          'Close',
          { duration: 5000 }
        );
        this.isTestingEmail = false;
      },
      error: (err) => {
        console.error('Error running weekly summary:', err);
        this.snackBar.open(
          'An error occurred. Please check the console.',
          'Close',
          { duration: 5000 }
        );
        this.isTestingEmail = false;
      },
    });
  }
}
