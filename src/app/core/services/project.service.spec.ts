import { TestBed } from '@angular/core/testing';
import { ProjectService } from './project.service';
import { SupabaseService } from './supabase.service';

describe('ProjectService', () => {
  let service: ProjectService;
  let supabaseService: SupabaseService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ProjectService,
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
    service = TestBed.inject(ProjectService);
    supabaseService = TestBed.inject(SupabaseService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});