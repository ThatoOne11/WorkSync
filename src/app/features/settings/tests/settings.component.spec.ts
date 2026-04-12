import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Settings } from '../settings';
import { SettingsService } from '../../../core/services/settings.service';
import { SettingsStateService } from '../services/settings-state.service';
import { ProjectService } from '../../projects/services/project.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { signal, WritableSignal } from '@angular/core';
import { of } from 'rxjs';
import { AppSettings } from '../../../shared/schemas/app.schemas';

describe('Settings Component Suite', () => {
  let component: Settings;
  let fixture: ComponentFixture<Settings>;

  let mockSettingsService: jasmine.SpyObj<SettingsService> & {
    settings: WritableSignal<AppSettings | null>;
  };
  let mockStateService: jasmine.SpyObj<SettingsStateService>;
  let mockProjectService: jasmine.SpyObj<ProjectService>;
  let mockSnackBar: jasmine.SpyObj<MatSnackBar>;
  let mockDialog: jasmine.SpyObj<MatDialog>;

  beforeEach(async () => {
    const settingsSpy = jasmine.createSpyObj('SettingsService', [
      'saveSettings',
      'clearSettings',
    ]);
    mockSettingsService = {
      ...settingsSpy,
      settings: signal<AppSettings | null>(null),
    };
    mockSettingsService.saveSettings.and.returnValue(Promise.resolve());
    mockSettingsService.clearSettings.and.returnValue(Promise.resolve());

    mockStateService = jasmine.createSpyObj('SettingsStateService', [
      'fetchUserId',
      'testEmail',
      'runBackfill',
    ]);
    mockStateService.fetchUserId.and.returnValue(of('user_123'));
    mockStateService.testEmail.and.returnValue(of(undefined));

    mockProjectService = jasmine.createSpyObj('ProjectService', [
      'getProjects',
    ]);
    mockProjectService.getProjects.and.returnValue(of([]));

    mockSnackBar = jasmine.createSpyObj('MatSnackBar', ['open']);
    mockDialog = jasmine.createSpyObj('MatDialog', ['open']);

    await TestBed.configureTestingModule({
      imports: [Settings, BrowserAnimationsModule],
      providers: [
        { provide: SettingsService, useValue: mockSettingsService },
        { provide: SettingsStateService, useValue: mockStateService },
        { provide: ProjectService, useValue: mockProjectService },
      ],
    })
      // FIXED: Force override to prevent MatSnackBarModule from shadowing the mock
      .overrideProvider(MatSnackBar, { useValue: mockSnackBar })
      .overrideProvider(MatDialog, { useValue: mockDialog })
      .compileComponents();

    fixture = TestBed.createComponent(Settings);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should initialize and load default empty state', () => {
    expect(component).toBeTruthy();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h3')?.textContent).toContain(
      'Clockify Credentials',
    );
  });

  it('should call saveSettings and trigger snackbar on valid submit', async () => {
    // Safely bypass TS protected scope explicitly to simulate form fill
    component['form'].patchValue({
      apiKey: 'valid_key',
      workspaceId: 'valid_ws',
      userId: 'valid_user',
    });

    await component.onSave();

    expect(mockSettingsService.saveSettings).toHaveBeenCalled();
    expect(mockSnackBar.open).toHaveBeenCalledWith(
      jasmine.any(String),
      'Close',
      jasmine.objectContaining({ duration: 3000 }),
    );
  });

  it('should block save and warn if form is invalid', async () => {
    await component.onSave();

    expect(mockSettingsService.saveSettings).not.toHaveBeenCalled();
    expect(mockSnackBar.open).toHaveBeenCalledWith(
      'Please correct the errors before saving.',
      'Close',
      jasmine.any(Object),
    );
  });

  it('should execute clearSettings and reset form on Reset', async () => {
    await component.onReset();

    expect(mockSettingsService.clearSettings).toHaveBeenCalled();
    expect(mockSnackBar.open).toHaveBeenCalledWith(
      jasmine.stringMatching(/cleared/),
      'Close',
      jasmine.any(Object),
    );
  });
});
