import { TestBed } from '@angular/core/testing';
import { ClockifyService } from './clockify.service';
import { SupabaseService } from './supabase.service';

describe('ClockifyService', () => {
  let service: ClockifyService;
  let supabaseService: SupabaseService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ClockifyService,
        {
          provide: SupabaseService,
          useValue: {
            supabase: {
              from: () => ({
                select: () => Promise.resolve({ data: [] }),
                insert: () => Promise.resolve({}),
                update: () => ({ eq: () => Promise.resolve({}) }),
                delete: () => ({ eq: () => Promise.resolve({}) }),
              }),
            },
          },
        },
      ],
    });
    service = TestBed.inject(ClockifyService);
    supabaseService = TestBed.inject(SupabaseService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});