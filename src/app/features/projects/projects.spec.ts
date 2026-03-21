import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Projects } from './projects';
import { SupabaseService } from '../../core/services/supabase.service';
import { SettingsService } from '../../core/services/settings.service';
import { signal } from '@angular/core';

describe('Projects', () => {
  let component: Projects;
  let fixture: ComponentFixture<Projects>;

  beforeEach(async () => {
    // Deep mock Supabase's chained `from().select().eq()` calls
    const mockSupabase = {
      supabase: {
        functions: { invoke: jasmine.createSpy() },
        from: jasmine.createSpy().and.returnValue({
          select: jasmine.createSpy().and.returnValue({
            eq: jasmine.createSpy().and.returnValue({
              eq: jasmine
                .createSpy()
                .and.returnValue(Promise.resolve({ data: [], error: null })),
            }),
          }),
        }),
      },
    };

    const mockSettings = {
      settings: signal(null),
      getBrowserId: () => 'test_browser_id',
    };

    await TestBed.configureTestingModule({
      imports: [Projects],
      providers: [
        { provide: SupabaseService, useValue: mockSupabase },
        { provide: SettingsService, useValue: mockSettings },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Projects);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
