import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProjectForm } from '../project-form';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

describe('ProjectForm', () => {
  let component: ProjectForm;
  let fixture: ComponentFixture<ProjectForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectForm],
      providers: [provideAnimationsAsync()],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectForm);
    component = fixture.componentInstance;

    // Set required signal inputs BEFORE change detection!
    fixture.componentRef.setInput('clockifyProjects', []);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
