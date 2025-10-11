import { Component, OnInit, inject, signal } from '@angular/core';
import { ProjectService } from '../../core/services/project.service';
import { ClockifyService } from '../../core/services/clockify.service';
import { Project } from '../../core/models/project.model';
import { ProjectList } from './components/project-list/project-list';
import { ProjectForm } from './components/project-form/project-form';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { SettingsService } from '../../core/services/settings.service';

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
  private snackBar = inject(MatSnackBar);
  private settingsService = inject(SettingsService);

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
    // 1. Fetch settings directly from the service (now synchronous)
    const settings = this.settingsService.getSettings();

    // 2. Check for credentials
    if (settings && settings.apiKey && settings.workspaceId) {
      // 3. Use the credentials to call ClockifyService
      this.clockifyService
        .getClockifyProjects(settings.apiKey, settings.workspaceId)
        .subscribe((projects: ClockifyProject[]) => {
          this.clockifyProjects.set(projects ?? []);
        });
    } else {
      // If settings are missing, ensure the list is cleared
      this.clockifyProjects.set([]);
      // The router guard should prevent the user from seeing this, but this is a safe fallback
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

  onMonthlyRollover() {
    const isConfirmed = confirm(
      'Are you sure you want to start a new month? This will archive all current projects.'
    );

    if (isConfirmed) {
      this.projectService.archiveAllProjects().subscribe({
        next: () => {
          this.loadProjects();
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
