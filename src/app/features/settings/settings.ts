import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  inject,
  signal,
  Signal,
  computed,
  DestroyRef,
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
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { combineLatest, startWith, map, catchError, of, switchMap } from 'rxjs';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import {
  takeUntilDestroyed,
  toObservable,
  toSignal,
} from '@angular/core/rxjs-interop';
import { BackfillDialog } from './dialogs/backfill-dialog/backfill-dialog';
import { SettingsService } from '../../core/services/settings.service';
import { SettingsStateService } from './services/settings-state.service';
import { getPreviousMonthNames } from '../../shared/utils/date.utils';
import { ProjectService } from '../projects/services/project.service';
import { AppSettings } from '../../shared/schemas/app.schemas';

@Component({
  selector: 'app-settings',
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
export class Settings implements OnInit {
  @ViewChild('emailInput') emailInput!: ElementRef<HTMLInputElement>;

  private readonly fb = inject(FormBuilder);
  private readonly settingsService = inject(SettingsService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  readonly isFetchingUserId = signal(false);
  readonly isTestingEmail = signal(false);
  readonly isBackfilling = signal(false);

  readonly state = inject(SettingsStateService);
  private readonly projectService = inject(ProjectService);

  protected form: FormGroup;
  protected settingsExist = signal(false);
  protected emailEditMode = signal(false);

  protected isFormDirty: Signal<boolean>;

  protected formValue: Signal<Partial<AppSettings> | undefined>;

  readonly activeProjects = toSignal(
    toObservable(this.settingsService.settings).pipe(
      switchMap((settings) =>
        settings ? this.projectService.getProjects() : of([]),
      ),
      catchError(() => of([])),
    ),
    { initialValue: [] },
  );

  readonly hasActiveProjects = computed(() => this.activeProjects().length > 0);

  constructor() {
    this.form = this.fb.group({
      apiKey: ['', Validators.required],
      workspaceId: ['', Validators.required],
      userId: [{ value: '', disabled: true }, Validators.required],
      notificationEmail: ['', [Validators.email]],
      enableEmailNotifications: [false],
      enablePacingAlerts: [false],
    });

    this.formValue = toSignal(this.form.valueChanges, {
      initialValue: undefined,
    });

    this.isFormDirty = computed(() => {
      this.formValue();
      const saved = this.settingsService.settings();
      const current = this.form.getRawValue();

      if (!saved) return this.form.dirty;

      return (
        current.apiKey !== saved.apiKey ||
        current.workspaceId !== saved.workspaceId ||
        current.notificationEmail !== saved.notificationEmail ||
        current.enableEmailNotifications !== saved.enableEmailNotifications ||
        current.enablePacingAlerts !== saved.enablePacingAlerts
      );
    });
  }

  ngOnInit(): void {
    this.loadSettings();
    this.setupConditionalEmailValidation();
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
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(([isWeeklyEnabled, isPacingEnabled]) => {
          if (isWeeklyEnabled || isPacingEnabled) {
            emailField.setValidators([Validators.required, Validators.email]);
          } else {
            emailField.clearValidators();
            emailField.addValidators([Validators.email]);
          }
          emailField.updateValueAndValidity();
        });
    }
  }

  private loadSettings(): void {
    const settings = this.settingsService.settings();

    if (settings) {
      this.form.patchValue(settings);
      this.form.get('apiKey')?.disable();
      this.form.get('workspaceId')?.disable();
      this.form.get('userId')?.disable();

      this.settingsExist.set(true);
      this.emailEditMode.set(!settings.notificationEmail);
    } else {
      this.form.enable();
      this.form.get('userId')?.disable();
      this.settingsExist.set(false);
      this.emailEditMode.set(true);
    }

    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.form.updateValueAndValidity();
  }

  protected getOriginalEmail(): string {
    return this.settingsService.settings()?.notificationEmail || '';
  }

  onCancelChanges(): void {
    this.loadSettings();
  }

  toggleEmailEdit(): void {
    this.emailEditMode.set(true);
    setTimeout(() => this.emailInput.nativeElement.focus(), 0);
  }

  async onSave(): Promise<void> {
    // Added async
    if (this.form.invalid) {
      this.snackBar.open('Please correct the errors before saving.', 'Close', {
        duration: 3000,
      });
      return;
    }

    const isInitialSave = !this.settingsExist();

    try {
      // Await the sync to ensure the global Signal is updated before we reload the form
      await this.settingsService.saveSettings(this.form.getRawValue());

      const message = isInitialSave
        ? 'Credentials saved successfully!'
        : 'Settings have been updated.';
      this.snackBar.open(message, 'Close', { duration: 3000 });

      // Re-trigger form state alignment
      this.loadSettings();
    } catch (err) {
      this.snackBar.open('Failed to save settings.', 'Close', {
        duration: 3000,
      });
    }
  }

  async onReset() {
    await this.settingsService.clearSettings();
    this.form.reset({
      userId: { value: '', disabled: true },
      enableEmailNotifications: false,
      enablePacingAlerts: false,
    });
    this.loadSettings();
    this.snackBar.open(
      'All your data has been cleared from this browser and the server.',
      'Close',
      { duration: 3000 },
    );
  }

  fetchUserId(): void {
    const apiKey = this.form.get('apiKey')?.value;
    if (!apiKey) return;

    this.isFetchingUserId.set(true);

    this.state
      .fetchUserId(apiKey)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (fetchedId) => {
          this.form.patchValue({ userId: fetchedId });
          this.form.get('userId')?.enable({ onlySelf: true, emitEvent: false });
          this.form.markAsDirty();
          this.form.updateValueAndValidity();
          this.snackBar.open('User ID fetched successfully!', 'Close', {
            duration: 3000,
          });
          this.isFetchingUserId.set(false);
        },
        error: () => {
          this.snackBar.open(
            'Could not fetch User ID. Check your API Key.',
            'Close',
            { duration: 3000 },
          );
          this.isFetchingUserId.set(false);
        },
      });
  }

  onBackfillHistory(): void {
    const months = getPreviousMonthNames(3);

    const dialogRef = this.dialog.open(BackfillDialog, {
      width: '600px',
      data: {
        projects: this.activeProjects(),
        months,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.isBackfilling.set(true);
        this.state
          .runBackfill(result)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (res) => {
              this.snackBar.open(res.message, 'Close', { duration: 5000 });
              this.isBackfilling.set(false);
            },
            error: () => {
              this.snackBar.open('Error during backfill.', 'Close', {
                duration: 5000,
              });
              this.isBackfilling.set(false);
            },
          });
      }
    });
  }

  onTestEmail(): void {
    this.isTestingEmail.set(true);
    this.state
      .testEmail()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.snackBar.open(
            'Test email sent successfully. Check your email!',
            'Close',
            { duration: 5000 },
          );
          this.isTestingEmail.set(false);
        },
        error: () => {
          this.snackBar.open('An error occurred.', 'Close', { duration: 5000 });
          this.isTestingEmail.set(false);
        },
      });
  }
}
