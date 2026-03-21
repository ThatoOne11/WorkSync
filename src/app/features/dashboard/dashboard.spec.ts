import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Dashboard } from './dashboard';
import { SupabaseService } from '../../core/services/supabase.service';
import { SettingsService } from '../../core/services/settings.service';
import { signal } from '@angular/core';

describe('Dashboard', () => {
  let component: Dashboard;
  let fixture: ComponentFixture<Dashboard>;

  beforeEach(async () => {
    const mockSupabase = {
      supabase: { functions: { invoke: jasmine.createSpy() } },
    };

    // Explicitly mock settings to null so it doesn't read leaky localStorage
    const mockSettings = {
      settings: signal(null),
      getBrowserId: () => 'test_browser_id',
    };

    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        { provide: SupabaseService, useValue: mockSupabase },
        { provide: SettingsService, useValue: mockSettings },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
