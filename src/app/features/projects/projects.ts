import {
  Component,
  OnInit,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProjectService } from '../../core/services/project.service';
import { ClockifyService } from '../../core/services/clockify.service';
import { Project } from '../../core/models/project.model';
import { AppStateService } from '../../core/state/app.state';
import { ProjectList } from './components/project-list/project-list';
import { ProjectForm } from './components/project-form/project-form';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [
    CommonModule,
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
export class Projects implements OnInit {
  private projectService = inject(ProjectService);
  private clockifyService = inject(ClockifyService);
  private state = inject(AppStateService);

  projects = this.state.projects;
  clockifyProjects = this.state.clockifyProjects;
  selectedProject = signal<Project | undefined>(undefined);

  ngOnInit() {
    this.projectService.getProjects().subscribe();
    this.loadClockifyProjects();
  }

  loadClockifyProjects() {
    const settings = this.state.settings();
    if (settings && settings.apiKey && settings.workspaceId) {
      this.clockifyService
        .getClockifyProjects(settings.apiKey, settings.workspaceId)
        .subscribe((projects: any) => {
          this.state.setClockifyProjects(projects ?? []);
        });
    }
  }

  onEditProject(project: Project) {
    this.selectedProject.set(project);
  }

  onDeleteProject(id: number) {
    this.projectService.deleteProject(id).subscribe();
  }

  onSaveProject(project: Partial<Project>) {
    const operation = project.id
      ? this.projectService.updateProject(project.id, project)
      : this.projectService.addProject(project);

    operation.subscribe(() => {
      this.selectedProject.set(undefined);
    });
  }

  onMonthlyRollover() {
    if (
      confirm(
        'Are you sure you want to start a new month? This will archive all current projects.'
      )
    ) {
      this.projectService.archiveAllProjects().subscribe();
    }
  }
}
