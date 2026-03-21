import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  inject,
  signal,
  Signal,
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
import { combineLatest, startWith, map } from 'rxjs';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { BackfillDialog } from './dialogs/backfill-dialog/backfill-dialog';
import { SettingsService } from '../../core/services/settings.service';
import { SettingsStateService } from './services/settings-state.service';

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

  readonly isFetchingUserId = signal(false);
  readonly isTestingEmail = signal(false);
  readonly isBackfilling = signal(false);

  readonly state = inject(SettingsStateService);

  protected form: FormGroup;
  protected settingsExist = signal(false);
  protected emailEditMode = signal(false);

  protected isFormDirty: Signal<boolean>;

  constructor() {
    this.form = this.fb.group({
      apiKey: ['', Validators.required],
      workspaceId: ['', Validators.required],
      userId: [{ value: '', disabled: true }, Validators.required],
      notificationEmail: ['', [Validators.email]],
      enableEmailNotifications: [false],
      enablePacingAlerts: [false],
    });

    this.isFormDirty = toSignal(
      this.form.valueChanges.pipe(map(() => this.form.dirty)),
      { initialValue: false },
    );
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
        .pipe(takeUntilDestroyed())
        .subscribe(([isWeeklyEnabled, isPacingEnabled]) => {
          if (isWeeklyEnabled || isPacingEnabled) {
            emailField.setValidators([Validators.required, Validators.email]);
          } else {
            emailField.clearValidators();
            emailField.addValidators([Validators.email]);
          }
          emailField.updateValueAndValidity({ emitEvent: false });
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

    this.state.fetchUserId(apiKey).subscribe({
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
    const today = new Date();
    const months = [...Array(3)].map((_, i) => {
      const d = new Date(today.getFullYear(), today.getMonth() - (i + 1), 1);
      return d.toLocaleString('default', { month: 'long' });
    });

    const dialogRef = this.dialog.open(BackfillDialog, {
      width: '600px',
      data: {
        projects: this.state.activeProjects(),
        months,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.isBackfilling.set(true);
        this.state.runBackfill(result).subscribe({
          next: (res) => {
            this.snackBar.open(res.message, 'Close', { duration: 5000 });
            this.isBackfilling.set(false);
          },
          error: () => {
            this.snackBar.open(
              'Error during backfill. Check the console.',
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
    this.state.testEmail().subscribe({
      next: () => {
        this.snackBar.open(
          'Weekly summary function ran successfully. Check your email!',
          'Close',
          { duration: 5000 },
        );
        this.isTestingEmail.set(false);
      },
      error: () => {
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
