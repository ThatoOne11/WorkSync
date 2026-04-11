import {
  Injectable,
  inject,
  Signal,
  computed,
  DestroyRef,
} from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, startWith } from 'rxjs';
import { SettingsService } from '../../../core/services/settings.service';
import { AppSettings } from '../../../shared/schemas/app.schemas';

export type SettingsFormModel = {
  apiKey: FormControl<string>;
  workspaceId: FormControl<string>;
  userId: FormControl<string>;
  notificationEmail: FormControl<string>;
  enableEmailNotifications: FormControl<boolean>;
  enablePacingAlerts: FormControl<boolean>;
};

@Injectable()
export class SettingsFormService {
  private readonly settingsService = inject(SettingsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly form = new FormGroup<SettingsFormModel>({
    apiKey: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    workspaceId: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    userId: new FormControl<string>(
      { value: '', disabled: true },
      { nonNullable: true, validators: [Validators.required] },
    ),
    notificationEmail: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.email],
    }),
    enableEmailNotifications: new FormControl<boolean>(false, {
      nonNullable: true,
    }),
    enablePacingAlerts: new FormControl<boolean>(false, {
      nonNullable: true,
    }),
  });

  private readonly formValue = toSignal(this.form.valueChanges, {
    initialValue: undefined,
  });

  readonly isFormDirty: Signal<boolean> = computed(() => {
    this.formValue(); // track changes
    const saved = this.settingsService.settings();
    const current = this.form.getRawValue();

    if (!saved) return this.form.dirty;

    return (
      current.apiKey !== (saved.apiKey ?? '') ||
      current.workspaceId !== (saved.workspaceId ?? '') ||
      current.notificationEmail !== (saved.notificationEmail ?? '') ||
      this.normalizeBoolean(current.enableEmailNotifications) !==
        this.normalizeBoolean(saved.enableEmailNotifications) ||
      this.normalizeBoolean(current.enablePacingAlerts) !==
        this.normalizeBoolean(saved.enablePacingAlerts)
    );
  });

  constructor() {
    this.setupConditionalEmailValidation();
  }

  private normalizeBoolean(val: unknown): boolean {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') return val === 'true';
    return false;
  }

  private setupConditionalEmailValidation(): void {
    const weeklyToggle = this.form.controls.enableEmailNotifications;
    const pacingToggle = this.form.controls.enablePacingAlerts;
    const emailField = this.form.controls.notificationEmail;

    combineLatest([
      weeklyToggle.valueChanges.pipe(startWith(weeklyToggle.value)),
      pacingToggle.valueChanges.pipe(startWith(pacingToggle.value)),
    ])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([isWeeklyEnabled, isPacingEnabled]) => {
        const isWeekly = this.normalizeBoolean(isWeeklyEnabled);
        const isPacing = this.normalizeBoolean(isPacingEnabled);

        if (isWeekly || isPacing) {
          emailField.setValidators([Validators.required, Validators.email]);
        } else {
          emailField.clearValidators();
          emailField.addValidators([Validators.email]);
        }
        emailField.updateValueAndValidity();
      });
  }

  loadSettingsState(): { settingsExist: boolean; emailEditMode: boolean } {
    const settings = this.settingsService.settings();
    let settingsExist = false;
    let emailEditMode = true;

    if (settings) {
      this.form.patchValue({
        apiKey: settings.apiKey ?? '',
        workspaceId: settings.workspaceId ?? '',
        userId: settings.userId ?? '',
        notificationEmail: settings.notificationEmail ?? '',
        enableEmailNotifications: this.normalizeBoolean(
          settings.enableEmailNotifications,
        ),
        enablePacingAlerts: this.normalizeBoolean(settings.enablePacingAlerts),
      });

      this.form.controls.apiKey.disable();
      this.form.controls.workspaceId.disable();
      this.form.controls.userId.disable();

      settingsExist = true;
      emailEditMode = !settings.notificationEmail;
    } else {
      this.form.enable();
      this.form.controls.userId.disable();
      settingsExist = false;
      emailEditMode = true;
    }

    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.form.updateValueAndValidity();

    return { settingsExist, emailEditMode };
  }

  getNormalizedPayload(): AppSettings {
    const rawFormValue = this.form.getRawValue();
    return {
      ...rawFormValue,
      enableEmailNotifications: this.normalizeBoolean(
        rawFormValue.enableEmailNotifications,
      ),
      enablePacingAlerts: this.normalizeBoolean(
        rawFormValue.enablePacingAlerts,
      ),
    };
  }

  resetForm(): void {
    this.form.reset({
      userId: '',
      enableEmailNotifications: false,
      enablePacingAlerts: false,
    });
  }
}
