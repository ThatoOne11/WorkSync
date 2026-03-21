import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TodayFocusComponent } from '../today-focus';
import { SupabaseService } from '../../../core/services/supabase.service';
import { SettingsService } from '../../../core/services/settings.service';
import { signal } from '@angular/core';

describe('TodayFocusComponent', () => {
  let component: TodayFocusComponent;
  let fixture: ComponentFixture<TodayFocusComponent>;

  beforeEach(async () => {
    const mockSupabase = {
      supabase: {
        functions: {
          invoke: jasmine
            .createSpy()
            .and.returnValue(
              Promise.resolve({ data: { focusList: [] }, error: null }),
            ),
        },
      },
    };
    const mockSettings = {
      settings: signal(null),
      getBrowserId: () => 'test_browser_id',
    };

    await TestBed.configureTestingModule({
      imports: [TodayFocusComponent],
      providers: [
        { provide: SupabaseService, useValue: mockSupabase },
        { provide: SettingsService, useValue: mockSettings },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TodayFocusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
