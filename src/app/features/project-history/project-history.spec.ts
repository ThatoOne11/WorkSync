import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProjectHistory } from './project-history';
import { provideRouter } from '@angular/router';
import { SupabaseService } from '../../core/services/supabase.service';

describe('ProjectHistory', () => {
  let component: ProjectHistory;
  let fixture: ComponentFixture<ProjectHistory>;

  beforeEach(async () => {
    const mockSupabase = {
      supabase: { functions: { invoke: jasmine.createSpy() } },
    };

    await TestBed.configureTestingModule({
      imports: [ProjectHistory],
      providers: [
        provideRouter([]),
        { provide: SupabaseService, useValue: mockSupabase },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectHistory);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
