import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
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
import { SettingsService } from '../../core/services/settings.service';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HistoricalDataService } from '../../core/services/historical-data.service';
import { MatIconModule } from '@angular/material/icon';
import { Subject, combineLatest, startWith, takeUntil } from 'rxjs';
import { ProjectService } from '../../core/services/project.service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ClockifyUserSchema, Project } from '../../shared/schemas/app.schemas';
import { BackfillDialog } from './dialogs/backfill-dialog/backfill-dialog';

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
    MatProgressSpinnerModule,
    MatIconModule,
    MatDialogModule,
  ],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Settings implements OnInit, OnDestroy {
  @ViewChild('emailInput') emailInput!: ElementRef<HTMLInputElement>;

  private fb = inject(FormBuilder);
  private clockifyService = inject(ClockifyService);
  private settingsService = inject(SettingsService);
  private historicalDataService = inject(HistoricalDataService);
  private projectService = inject(ProjectService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  private activeProjects: Project[] = [];
  private destroy$ = new Subject<void>();

  protected form: FormGroup;
  protected settingsExist = signal(false);
  protected isBackfilling = signal(false);
  protected isTestingEmail = signal(false);
  protected isFetchingUserId = signal(false);
  protected hasActiveProjects = signal(false);
  protected emailEditMode = signal(false);

  protected initialToggleValues = {
    enableEmailNotifications: false,
    enablePacingAlerts: false,
  };
  protected isToggleDirty = signal(false);

  constructor() {
    this.form = this.fb.group({
      apiKey: ['', Validators.required],
      workspaceId: ['', Validators.required],
      userId: [{ value: '', disabled: true }, Validators.required],
      notificationEmail: ['', [Validators.email]],
      enableEmailNotifications: [false],
      enablePacingAlerts: [false],
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
    const weeklyToggle = this.form.get('enableEmailNotifications');
    const pacingToggle = this.form.get('enablePacingAlerts');
    const emailField = this.form.get('notificationEmail');

    if (weeklyToggle && pacingToggle && emailField) {
      combineLatest([
        weeklyToggle.valueChanges.pipe(startWith(weeklyToggle.value)),
        pacingToggle.valueChanges.pipe(startWith(pacingToggle.value)),
      ])
        .pipe(takeUntilDestroyed())
        .subscribe(([isWeeklyEnabled, isPacingEnabled]) => {
          if (isWeeklyEnabled || isPacingEnabled) {
            emailField.setValidators([Validators.required, Validators.email]);
          } else {
            emailField.clearValidators();
            emailField.addValidators([Validators.email]);
          }
          emailField.updateValueAndValidity();

          const weeklyChanged =
            weeklyToggle.value !==
            this.initialToggleValues.enableEmailNotifications;
          const pacingChanged =
            pacingToggle.value !== this.initialToggleValues.enablePacingAlerts;
          this.isToggleDirty.set(weeklyChanged || pacingChanged);
        });
    }
  }

  private loadSettings(): void {
    const settings = this.settingsService.settings(); // Instantly read the signal from core!

    if (settings) {
      this.form.patchValue(settings);
      this.form.get('apiKey')?.disable();
      this.form.get('workspaceId')?.disable();
      this.form.get('userId')?.disable();

      this.initialToggleValues = {
        enableEmailNotifications: settings.enableEmailNotifications,
        enablePacingAlerts: settings.enablePacingAlerts,
      };

      this.settingsExist.set(true);
      this.emailEditMode.set(!settings.notificationEmail);
    } else {
      this.form.enable();
      this.form.get('userId')?.disable();
      this.settingsExist.set(false);
      this.emailEditMode.set(true);
      this.initialToggleValues = {
        enableEmailNotifications: false,
        enablePacingAlerts: false,
      };
    }

    this.checkActiveProjects();
    this.form.markAsPristine();
    this.isToggleDirty.set(false);
  }

  protected getOriginalEmail(): string {
    return this.settingsService.settings()?.notificationEmail || '';
  }

  onCancelChanges(): void {
    const settings = this.settingsService.settings();
    const emailField = this.form.get('notificationEmail');
    const weeklyToggle = this.form.get('enableEmailNotifications');
    const pacingToggle = this.form.get('enablePacingAlerts');

    // 1. Reset toggles to initial state (Bug 4)
    weeklyToggle?.setValue(this.initialToggleValues.enableEmailNotifications, {
      emitEvent: true,
    });
    pacingToggle?.setValue(this.initialToggleValues.enablePacingAlerts, {
      emitEvent: true,
    });

    // 2. Reset email field to saved state (Bug 4)
    const originalEmail = settings?.notificationEmail || '';
    emailField?.setValue(originalEmail);

    // 3. Exit email edit mode and mark as pristine
    this.emailEditMode.set(!originalEmail); // Exit edit mode unless no email was ever set
    this.form.markAsPristine(); // Resets overall dirty state (fixes Bug 2 for toggles)
    this.isToggleDirty.set(false);
  }

  toggleEmailEdit(): void {
    if (this.emailEditMode()) {
      // If exiting edit mode (clicking 'cancel' icon), reset the field value
      const originalEmail =
        this.settingsService.settings()?.notificationEmail || '';
      this.form.get('notificationEmail')?.setValue(originalEmail);
    }
    this.emailEditMode.update((v) => !v);
    if (this.emailEditMode()) {
      setTimeout(() => this.emailInput.nativeElement.focus(), 0);
    }
  }

  private checkActiveProjects(): void {
    if (this.settingsExist()) {
      this.projectService.getProjects().subscribe((projects: Project[]) => {
        this.activeProjects = projects; // Store for the dialog
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

  async onReset() {
    await this.settingsService.clearSettings();
    this.form.reset({
      userId: { value: '', disabled: true },
      enableEmailNotifications: false,
      enablePacingAlerts: false,
    });
    this.loadSettings();
    this.hasActiveProjects.set(false);
    this.snackBar.open(
      'All your data has been cleared from this browser and the server.',
      'Close',
      {
        duration: 3000,
      },
    );
  }

  fetchUserId(): void {
    const apiKey = this.form.get('apiKey')?.value;
    const workspaceId = this.form.get('workspaceId')?.value;

    if (!apiKey || !workspaceId) {
      this.snackBar.open(
        'Please enter both API Key and Workspace ID.',
        'Close',
        { duration: 3000 },
      );
      return;
    }

    this.isFetchingUserId.set(true);

    this.clockifyService.getCurrentUserId(apiKey).subscribe({
      // FIXED: Safely parse as unknown first, then validate with Zod!
      next: (response: unknown) => {
        try {
          const user = ClockifyUserSchema.parse(response);
          this.form.patchValue({ userId: user.id });
          this.form.get('userId')?.enable({ onlySelf: true, emitEvent: false });
          this.snackBar.open('User ID fetched successfully!', 'Close', {
            duration: 3000,
          });
        } catch (e) {
          this.snackBar.open(
            'Could not fetch User ID. Check your API Key.',
            'Close',
            { duration: 3000 },
          );
        }
        this.isFetchingUserId.set(false);
      },
      error: (err) => {
        console.error('Error fetching user ID:', err);
        this.snackBar.open(
          'Error fetching User ID. Check the console for details.',
          'Close',
          { duration: 3000 },
        );
        this.isFetchingUserId.set(false);
      },
    });
  }

  onBackfillHistory(): void {
    const today = new Date();
    const months = [...Array(3)].map((_, i) => {
      const d = new Date(today.getFullYear(), today.getMonth() - (i + 1), 1);
      return d.toLocaleString('default', { month: 'long' });
    });

    const dialogRef = this.dialog.open(BackfillDialog, {
      width: '600px',
      data: {
        projects: this.activeProjects,
        months,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.isBackfilling.set(true);
        this.historicalDataService.backfillHistory(result).subscribe({
          next: (response: any) => {
            this.snackBar.open(response.message, 'Close', { duration: 5000 });
            this.isBackfilling.set(false);
          },
          error: (err) => {
            console.error('Error during backfill:', err);
            this.snackBar.open(
              'An error occurred during backfill. Check the console.',
              'Close',
              { duration: 5000 },
            );
            this.isBackfilling.set(false);
          },
        });
      }
    });
  }

  onTestEmail(): void {
    this.isTestingEmail.set(true);
    this.settingsService.runWeeklySummary().subscribe({
      next: (response: any) => {
        this.snackBar.open(
          'Weekly summary function ran successfully. Check your email!',
          'Close',
          { duration: 5000 },
        );
        this.isTestingEmail.set(false);
      },
      error: (err) => {
        console.error('Error running weekly summary:', err);
        this.snackBar.open(
          'An error occurred. Please check the console.',
          'Close',
          { duration: 5000 },
        );
        this.isTestingEmail.set(false);
      },
    });
  }
}
