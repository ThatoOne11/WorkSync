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
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { Subject, combineLatest, startWith } from 'rxjs';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BackfillDialog } from './dialogs/backfill-dialog/backfill-dialog';
import { SettingsService } from '../../services/settings.service';
import { SettingsStateService } from './services/settings-state.service';

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

  private readonly fb = inject(FormBuilder);
  private readonly settingsService = inject(SettingsService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  // Publicly injected so the template can bind to its signals
  readonly state = inject(SettingsStateService);

  private readonly destroy$ = new Subject<void>();

  protected form: FormGroup;
  protected settingsExist = signal(false);
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
    const settings = this.settingsService.settings();

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

    this.state.checkActiveProjects();
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

    weeklyToggle?.setValue(this.initialToggleValues.enableEmailNotifications, {
      emitEvent: true,
    });
    pacingToggle?.setValue(this.initialToggleValues.enablePacingAlerts, {
      emitEvent: true,
    });

    const originalEmail = settings?.notificationEmail || '';
    emailField?.setValue(originalEmail);

    this.emailEditMode.set(!originalEmail);
    this.form.markAsPristine();
    this.isToggleDirty.set(false);
  }

  toggleEmailEdit(): void {
    if (this.emailEditMode()) {
      const originalEmail =
        this.settingsService.settings()?.notificationEmail || '';
      this.form.get('notificationEmail')?.setValue(originalEmail);
    }
    this.emailEditMode.update((v) => !v);
    if (this.emailEditMode()) {
      setTimeout(() => this.emailInput.nativeElement.focus(), 0);
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
    this.snackBar.open(
      'All your data has been cleared from this browser and the server.',
      'Close',
      { duration: 3000 },
    );
  }

  async fetchUserId(): Promise<void> {
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

    const fetchedId = await this.state.fetchUserId(apiKey, workspaceId);

    if (fetchedId) {
      this.form.patchValue({ userId: fetchedId });
      this.form.get('userId')?.enable({ onlySelf: true, emitEvent: false });
    }
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
        this.state.runBackfill(result);
      }
    });
  }

  onTestEmail(): void {
    this.state.testEmail();
  }
}
