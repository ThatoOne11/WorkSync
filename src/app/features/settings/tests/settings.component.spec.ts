import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Settings } from '../settings';
import { SupabaseService } from '../../../core/services/supabase.service';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

describe('Settings', () => {
  let component: Settings;
  let fixture: ComponentFixture<Settings>;

  beforeEach(async () => {
    const mockSupabase = {
      supabase: { functions: { invoke: jasmine.createSpy() } },
    };

    await TestBed.configureTestingModule({
      imports: [Settings],
      providers: [
        provideAnimationsAsync(),
        { provide: SupabaseService, useValue: mockSupabase },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Settings);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
