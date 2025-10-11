import { Component, OnInit, inject, signal } from '@angular/core';
import { ProjectService } from '../../core/services/project.service';
import { ClockifyService } from '../../core/services/clockify.service'; // Import ClockifyService
import { Project } from '../../core/models/project.model';
import { ProjectList } from './components/project-list/project-list';
import { ProjectForm } from './components/project-form/project-form';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

interface ClockifyProject {
  id: string;
  name: string;
}

@Component({
  selector: 'app-projects',
  standalone: true, // Ensure standalone is true
  imports: [ProjectList, ProjectForm, MatButtonModule, MatIconModule],
  templateUrl: './projects.html',
  styleUrl: './projects.scss',
})
export class Projects implements OnInit {
  private projectService = inject(ProjectService);
  private clockifyService = inject(ClockifyService);

  projects = signal<Project[]>([]);
  clockifyProjects = signal<ClockifyProject[]>([]); // Re-added signal for Clockify projects
  selectedProject = signal<Project | undefined>(undefined);

  ngOnInit() {
    this.loadProjects();
    this.loadClockifyProjects(); // Re-added Load Clockify projects
  }

  loadProjects() {
    this.projectService.getProjects().subscribe((projects) => {
      this.projects.set(projects ?? []);
    });
  }

  loadClockifyProjects() {
    const settings = JSON.parse(localStorage.getItem('work-sync-settings') || 'null');
    if (settings && settings.apiKey && settings.workspaceId) {
      this.clockifyService.getClockifyProjects(settings.apiKey, settings.workspaceId).subscribe((projects: ClockifyProject[]) => {
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
    this.selectedProject.set(undefined); // Clear selection for new project
  }
}