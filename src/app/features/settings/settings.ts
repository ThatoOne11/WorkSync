import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  inject,
  signal,
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
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import {
  AppSettings,
  SettingsService,
} from '../../core/services/settings.service';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HistoricalDataService } from '../../core/services/historical-data.service';
import { MatIconModule } from '@angular/material/icon';
import { Subject, takeUntil } from 'rxjs';
import { ProjectService } from '../../core/services/project.service';
import { Project } from '../../core/models/project.model';

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
    MatIconModule,
  ],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Settings implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private clockifyService = inject(ClockifyService);
  private settingsService = inject(SettingsService);
  private historicalDataService = inject(HistoricalDataService);
  private projectService = inject(ProjectService);
  private snackBar = inject(MatSnackBar);
  private destroy$ = new Subject<void>();

  protected form: FormGroup;
  protected settingsExist = signal(false);
  protected isBackfilling = signal(false);
  protected isTestingEmail = signal(false);
  protected isFetchingUserId = signal(false);
  protected hasActiveProjects = signal(false);

  constructor() {
    this.form = this.fb.group({
      apiKey: ['', Validators.required],
      workspaceId: ['', Validators.required],
      userId: [{ value: '', disabled: true }, Validators.required],
      notificationEmail: ['', [Validators.email]],
      enableEmailNotifications: [false],
    });
  }

  ngOnInit(): void {
    this.loadSettings();
    this.setupConditionalEmailValidation();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupConditionalEmailValidation(): void {
    const emailToggle = this.form.get('enableEmailNotifications');
    const emailField = this.form.get('notificationEmail');

    emailToggle?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((isEnabled) => {
        if (isEnabled) {
          emailField?.setValidators([Validators.required, Validators.email]);
        } else {
          emailField?.clearValidators();
          emailField?.addValidators([Validators.email]);
        }
        emailField?.updateValueAndValidity();
      });
  }

  private loadSettings(): void {
    const settings = this.settingsService.getSettings();
    if (settings) {
      this.form.patchValue(settings);
      this.form.get('apiKey')?.disable();
      this.form.get('workspaceId')?.disable();
      this.form.get('userId')?.disable();
      this.settingsExist.set(true);
    } else {
      this.form.enable();
      this.form.get('userId')?.disable();
      this.settingsExist.set(false);
    }
    this.checkActiveProjects();
    this.form.markAsPristine();
  }

  private checkActiveProjects(): void {
    if (this.settingsExist()) {
      this.projectService.getProjects().subscribe((projects: Project[]) => {
        this.hasActiveProjects.set(projects && projects.length > 0);
      });
    }
  }

  onSave(): void {
    if (this.form.invalid) {
      this.snackBar.open('Please correct the errors before saving.', 'Close', {
        duration: 3000,
      });
      return;
    }

    const isInitialSave = !this.settingsExist();
    this.settingsService.saveSettings(this.form.getRawValue());

    const message = isInitialSave
      ? 'Credentials saved successfully!'
      : 'Settings have been updated.';
    this.snackBar.open(message, 'Close', { duration: 3000 });

    this.loadSettings();
  }

  onReset(): void {
    this.settingsService.clearSettings();
    this.form.reset({
      userId: { value: '', disabled: true },
      enableEmailNotifications: false,
    });
    this.loadSettings();
    this.hasActiveProjects.set(false);
    this.snackBar.open('Credentials have been cleared.', 'Close', {
      duration: 3000,
    });
  }

  fetchUserId(): void {
    const apiKey = this.form.get('apiKey')?.value;
    const workspaceId = this.form.get('workspaceId')?.value;
    if (!apiKey || !workspaceId) {
      this.snackBar.open(
        'Please enter both API Key and Workspace ID.',
        'Close',
        {
          duration: 3000,
        }
      );
      return;
    }

    this.isFetchingUserId.set(true);
    this.clockifyService.getCurrentUserId(apiKey).subscribe({
      next: (user: any) => {
        if (user && user.id) {
          this.form.patchValue({ userId: user.id });
          this.form.get('userId')?.enable({ onlySelf: true, emitEvent: false });
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
        this.isFetchingUserId.set(false);
      },
      error: (err) => {
        console.error('Error fetching user ID:', err);
        this.snackBar.open(
          'Error fetching User ID. Check the console for details.',
          'Close',
          { duration: 3000 }
        );
        this.isFetchingUserId.set(false);
      },
    });
  }

  onBackfillHistory(): void {
    this.isBackfilling.set(true);
    this.historicalDataService.backfillHistory().subscribe({
      next: (response: any) => {
        this.snackBar.open(response.message, 'Close', { duration: 5000 });
        this.isBackfilling.set(false);
      },
      error: (err) => {
        console.error('Error during backfill:', err);
        this.snackBar.open(
          'An error occurred during backfill. Check the console.',
          'Close',
          { duration: 5000 }
        );
        this.isBackfilling.set(false);
      },
    });
  }

  onTestEmail(): void {
    this.isTestingEmail.set(true);
    this.settingsService.runWeeklySummary().subscribe({
      next: (response: any) => {
        this.snackBar.open(
          'Weekly summary function ran successfully. Check your email!',
          'Close',
          { duration: 5000 }
        );
        this.isTestingEmail.set(false);
      },
      error: (err) => {
        console.error('Error running weekly summary:', err);
        this.snackBar.open(
          'An error occurred. Please check the console.',
          'Close',
          { duration: 5000 }
        );
        this.isTestingEmail.set(false);
      },
    });
  }
}
