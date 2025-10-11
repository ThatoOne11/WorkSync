import { Component, OnInit, inject, signal } from '@angular/core';
import { ProjectService } from '../../core/services/project.service';
import { ClockifyService } from '../../core/services/clockify.service';
import { Project } from '../../core/models/project.model';
import { ProjectList } from './components/project-list/project-list';
import { ProjectForm } from './components/project-form/project-form';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar'; // Import MatSnackBar
import { MatCardModule } from '@angular/material/card';

interface ClockifyProject {
  id: string;
  name: string;
}

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [
    ProjectList,
    ProjectForm,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
  ],
  templateUrl: './projects.html',
  styleUrl: './projects.scss',
})
export class Projects implements OnInit {
  private projectService = inject(ProjectService);
  private clockifyService = inject(ClockifyService);
  private snackBar = inject(MatSnackBar); // Inject MatSnackBar

  projects = signal<Project[]>([]);
  clockifyProjects = signal<ClockifyProject[]>([]);
  selectedProject = signal<Project | undefined>(undefined);

  ngOnInit() {
    this.loadProjects();
    this.loadClockifyProjects();
  }

  loadProjects() {
    this.projectService.getProjects().subscribe((projects) => {
      this.projects.set(projects ?? []);
    });
  }

  loadClockifyProjects() {
    const settings = JSON.parse(
      localStorage.getItem('work-sync-settings') || 'null'
    );
    if (settings && settings.apiKey && settings.workspaceId) {
      this.clockifyService
        .getClockifyProjects(settings.apiKey, settings.workspaceId)
        .subscribe((projects: ClockifyProject[]) => {
          this.clockifyProjects.set(projects ?? []);
        });
    }
  }

  onEditProject(project: Project) {
    this.selectedProject.set(project);
  }

  onDeleteProject(id: number) {
    this.projectService.deleteProject(id).subscribe(() => this.loadProjects());
  }

  onSaveProject(project: Partial<Project>) {
    const operation = project.id
      ? this.projectService.updateProject(project.id, project)
      : this.projectService.addProject(project);

    operation.subscribe(() => {
      this.loadProjects();
      this.selectedProject.set(undefined);
    });
  }

  onNewProject() {
    this.selectedProject.set(undefined);
  }

  // --- NEW FUNCTION for Monthly Rollover ---
  onMonthlyRollover() {
    // Use the browser's confirm dialog for simplicity
    const isConfirmed = confirm(
      'Are you sure you want to start a new month? This will archive all current projects.'
    );

    if (isConfirmed) {
      this.projectService.archiveAllProjects().subscribe({
        next: () => {
          this.loadProjects(); // This will now fetch an empty list
          this.snackBar.open(
            'All projects have been archived. Ready for the new month!',
            'Close',
            { duration: 3000 }
          );
        },
        error: (err) => {
          console.error('Error during monthly rollover:', err);
          this.snackBar.open(
            'An error occurred. Please check the console.',
            'Close',
            { duration: 3000 }
          );
        },
      });
    }
  }
}
