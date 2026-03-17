import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  computed,
} from '@angular/core';
import { ProjectService } from '../../core/services/project.service';
import { ClockifyService } from '../../core/services/clockify.service';
import { Project } from '../../shared/schemas/app.schemas';
import { ProjectList } from './components/project-list/project-list';
import { ProjectForm } from './components/project-form/project-form';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { SettingsService } from '../../core/services/settings.service';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap, map, catchError, of } from 'rxjs';

interface ClockifyProject {
  id: string;
  name: string;
}

@Component({
  selector: 'app-projects',
  imports: [
    ProjectList,
    ProjectForm,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
  ],
  templateUrl: './projects.html',
  styleUrl: './projects.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Projects {
  private readonly projectService = inject(ProjectService);
  private readonly clockifyService = inject(ClockifyService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly settingsService = inject(SettingsService);

  readonly selectedProject = signal<Project | undefined>(undefined);
  private readonly reloadTrigger = signal(0);

  readonly projects = toSignal(
    toObservable(this.reloadTrigger).pipe(
      switchMap(() => this.projectService.getProjects()),
      catchError(() => of([])),
    ),
    { initialValue: [] as Project[] },
  );

  readonly clockifyProjects = toSignal(
    toObservable(this.settingsService.settings).pipe(
      switchMap((settings) => {
        if (settings?.apiKey && settings?.workspaceId) {
          return this.clockifyService
            .getClockifyProjects(settings.apiKey, settings.workspaceId)
            .pipe(map((res) => res as ClockifyProject[]));
        }
        return of([]);
      }),
      catchError(() => of([])),
    ),
    { initialValue: [] as ClockifyProject[] },
  );

  readonly availableClockifyProjects = computed(() => {
    const existingProjectIds = new Set(
      this.projects().map((p) => p.clockify_project_id),
    );
    return this.clockifyProjects().filter(
      (cp) => !existingProjectIds.has(cp.id),
    );
  });

  onEditProject(project: Project) {
    this.selectedProject.set(project);
  }

  onDeleteProject(id: number) {
    this.projectService
      .deleteProject(id)
      .subscribe(() => this.reloadTrigger.update((v) => v + 1));
  }

  onSaveProject(projectData: Partial<Project>) {
    let operation;

    if (projectData.id) {
      operation = this.projectService.updateProject(
        projectData.id,
        projectData,
      );
    } else {
      const selectedClockifyProject = this.clockifyProjects().find(
        (p) => p.id === projectData.clockify_project_id,
      );

      const { id: _id, ...newProjectData } = projectData;
      const projectToSave: Partial<Project> = {
        ...newProjectData,
        name: selectedClockifyProject?.name,
      };
      operation = this.projectService.addProject(projectToSave);
    }

    operation.subscribe(() => {
      this.reloadTrigger.update((v) => v + 1);
      this.selectedProject.set(undefined);
    });
  }

  onCancelEdit() {
    this.selectedProject.set(undefined);
  }

  onMonthlyRollover() {
    if (
      confirm(
        'Are you sure you want to start a new month? This will archive all current projects.',
      )
    ) {
      this.projectService.archiveAllProjects().subscribe({
        next: () => {
          this.reloadTrigger.update((v) => v + 1);
          this.snackBar.open(
            'All projects have been archived. Ready for the new month!',
            'Close',
            { duration: 3000 },
          );
        },
        error: () =>
          this.snackBar.open('An error occurred.', 'Close', { duration: 3000 }),
      });
    }
  }
}
