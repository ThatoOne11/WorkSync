import { TestBed } from '@angular/core/testing';
import { SettingsService } from '../services/settings.service';
import { SupabaseService } from '../services/supabase.service';
import { STORAGE_CONSTANTS } from '../../shared/constants/storage.constants';
import { AppSettings } from '../../shared/schemas/app.schemas';

describe('SettingsService Suite', () => {
  let service: SettingsService;
  let mockSupabaseService: jasmine.SpyObj<any>;

  beforeEach(() => {
    // 1. Mock the Supabase client so we don't make real network requests
    mockSupabaseService = {
      supabase: {
        functions: {
          invoke: jasmine
            .createSpy('invoke')
            .and.returnValue(Promise.resolve({ data: null, error: null })),
        },
      },
    };

    TestBed.configureTestingModule({
      providers: [
        SettingsService,
        { provide: SupabaseService, useValue: mockSupabaseService },
      ],
    });

    service = TestBed.inject(SettingsService);

    // Clear storage before each test
    localStorage.clear();
  });

  it('should mask the apiKey before saving it to localStorage', async () => {
    const rawSettings: AppSettings = {
      apiKey: 'super_secret_real_key_123',
      workspaceId: 'ws_1',
      userId: 'usr_1',
      notificationEmail: '',
      enableEmailNotifications: false,
      enablePacingAlerts: false,
    };

    await service.saveSettings(rawSettings);

    // 1. Verify it called Supabase (sending the real key to the secure backend)
    expect(mockSupabaseService.supabase.functions.invoke).toHaveBeenCalled();

    // 2. Verify LocalStorage ONLY contains the masked key
    const savedLocal = JSON.parse(
      localStorage.getItem(STORAGE_CONSTANTS.SETTINGS_KEY) || '{}',
    );
    expect(savedLocal.apiKey).toBe('••••••••••••••••');
    expect(savedLocal.apiKey).not.toBe('super_secret_real_key_123');
  });

  it('should instantly invalidate the AI Cache when settings are saved', async () => {
    // Seed a fake cache
    localStorage.setItem(STORAGE_CONSTANTS.AI_INSIGHTS_CACHE_KEY, 'stale_data');

    const newSettings: AppSettings = {
      apiKey: 'key',
      workspaceId: 'ws',
      userId: 'usr',
      notificationEmail: '',
      enableEmailNotifications: false,
      enablePacingAlerts: false,
    };

    await service.saveSettings(newSettings);

    // Verify the cache was completely nuked
    expect(
      localStorage.getItem(STORAGE_CONSTANTS.AI_INSIGHTS_CACHE_KEY),
    ).toBeNull();
  });

  it('should completely clear all user data on clearSettings()', async () => {
    localStorage.setItem(STORAGE_CONSTANTS.SETTINGS_KEY, 'some_data');
    localStorage.setItem(STORAGE_CONSTANTS.BROWSER_ID_KEY, 'browser_123');
    localStorage.setItem(STORAGE_CONSTANTS.AI_INSIGHTS_CACHE_KEY, 'stale_data');

    await service.clearSettings();

    expect(localStorage.getItem(STORAGE_CONSTANTS.SETTINGS_KEY)).toBeNull();
    expect(localStorage.getItem(STORAGE_CONSTANTS.BROWSER_ID_KEY)).toBeNull();
    expect(
      localStorage.getItem(STORAGE_CONSTANTS.AI_INSIGHTS_CACHE_KEY),
    ).toBeNull();
    expect(service.settings()).toBeNull();
  });
});
