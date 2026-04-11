import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  inject,
  signal,
  computed,
  DestroyRef,
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import {
  takeUntilDestroyed,
  toObservable,
  toSignal,
} from '@angular/core/rxjs-interop';
import { catchError, of, switchMap } from 'rxjs';

import { BackfillDialog } from './dialogs/backfill-dialog/backfill-dialog';
import { SettingsService } from '../../core/services/settings.service';
import { SettingsStateService } from './services/settings-state.service';
import { SettingsFormService } from './services/settings-form.service';
import { getPreviousMonthNames } from '../../shared/utils/date.utils';
import { ProjectService } from '../projects/services/project.service';

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
  providers: [SettingsFormService],
})
export class Settings implements OnInit {
  @ViewChild('emailInput') emailInput!: ElementRef<HTMLInputElement>;

  private readonly settingsService = inject(SettingsService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);
  private readonly projectService = inject(ProjectService);

  readonly state = inject(SettingsStateService);
  readonly formService = inject(SettingsFormService);

  readonly isFetchingUserId = signal(false);
  readonly isTestingEmail = signal(false);
  readonly isBackfilling = signal(false);

  protected settingsExist = signal(false);
  protected emailEditMode = signal(false);

  // Directly expose FormService properties
  protected readonly form = this.formService.form;
  protected readonly isFormDirty = this.formService.isFormDirty;

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

  ngOnInit(): void {
    this.loadSettings();
  }

  private loadSettings(): void {
    const state = this.formService.loadSettingsState();
    this.settingsExist.set(state.settingsExist);
    this.emailEditMode.set(state.emailEditMode);
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
    if (this.form.invalid) {
      this.snackBar.open('Please correct the errors before saving.', 'Close', {
        duration: 3000,
      });
      return;
    }

    const isInitialSave = !this.settingsExist();

    try {
      await this.settingsService.saveSettings(
        this.formService.getNormalizedPayload(),
      );

      const message = isInitialSave
        ? 'Credentials saved successfully!'
        : 'Settings have been updated.';
      this.snackBar.open(message, 'Close', { duration: 3000 });

      // Re-trigger form state alignment
      this.loadSettings();
    } catch (_err) {
      this.snackBar.open('Failed to save settings.', 'Close', {
        duration: 3000,
      });
    }
  }

  async onReset(): Promise<void> {
    await this.settingsService.clearSettings();
    this.formService.resetForm();
    this.loadSettings();
    this.snackBar.open(
      'All your data has been cleared from this browser and the server.',
      'Close',
      { duration: 3000 },
    );
  }

  fetchUserId(): void {
    const apiKey = this.form.controls.apiKey.value;
    if (!apiKey) return;

    this.isFetchingUserId.set(true);

    this.state
      .fetchUserId(apiKey)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (fetchedId) => {
          this.form.patchValue({ userId: fetchedId });
          this.form.controls.userId.enable({
            onlySelf: true,
            emitEvent: false,
          });
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
      data: { projects: this.activeProjects(), months },
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
