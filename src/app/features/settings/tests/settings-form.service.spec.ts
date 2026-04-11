import { TestBed } from '@angular/core/testing';
import { SettingsFormService } from '../services/settings-form.service';
import { SettingsService } from '../../../core/services/settings.service';
import { signal, WritableSignal } from '@angular/core';
import { AppSettings } from '../../../shared/schemas/app.schemas';

describe('SettingsFormService Suite', () => {
  let service: SettingsFormService;
  let mockSettingsService: jasmine.SpyObj<SettingsService> & {
    settings: WritableSignal<AppSettings | null>;
  };

  beforeEach(() => {
    const settingsSpy = jasmine.createSpyObj('SettingsService', [
      'saveSettings',
    ]);

    mockSettingsService = {
      ...settingsSpy,
      settings: signal<AppSettings | null>(null),
    };

    TestBed.configureTestingModule({
      providers: [
        SettingsFormService,
        { provide: SettingsService, useValue: mockSettingsService },
      ],
    });

    service = TestBed.inject(SettingsFormService);
  });

  it('should initialize with userId disabled', () => {
    expect(service.form).toBeTruthy();
    expect(service.form.controls.userId.disabled).toBeTrue();
  });

  it('should strictly enforce conditional validation on notificationEmail', () => {
    const emailCtrl = service.form.controls.notificationEmail;
    const weeklyCtrl = service.form.controls.enableEmailNotifications;

    expect(emailCtrl.hasError('required')).toBeFalse();

    weeklyCtrl.setValue(true);
    expect(emailCtrl.hasError('required')).toBeTrue();

    emailCtrl.setValue('test@worksync.com');
    expect(emailCtrl.valid).toBeTrue();
  });

  it('should correctly normalize string booleans in getNormalizedPayload', () => {
    service.form.patchValue({
      apiKey: 'test_key',
      workspaceId: 'test_ws',
      enableEmailNotifications: 'true' as unknown as boolean, // simulate rogue DOM string
      enablePacingAlerts: false,
    });

    // FIXED: Call method on the service directly, not the form
    const payload = service.getNormalizedPayload();

    expect(payload.enableEmailNotifications).toBeTrue();
    expect(payload.enablePacingAlerts).toBeFalse();
  });
});
