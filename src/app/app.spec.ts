import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { provideRouter } from '@angular/router';
import { SupabaseService } from './core/services/supabase.service';

describe('App', () => {
  beforeEach(async () => {
    // Mock Supabase to prevent Auth Lock crashes during testing
    const mockSupabase = {
      supabase: { functions: { invoke: jasmine.createSpy() } },
    };

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        { provide: SupabaseService, useValue: mockSupabase },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
