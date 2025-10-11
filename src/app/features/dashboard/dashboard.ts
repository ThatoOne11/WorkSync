import { Component, OnInit, inject, signal } from '@angular/core';
import { ProjectService } from '../../core/services/project.service';
import { ClockifyService } from '../../core/services/clockify.service';
import { Project } from '../../core/models/project.model';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatGridListModule } from '@angular/material/grid-list';

interface TimeEntry {
  projectId: string;
  timeInterval: {
    duration: string; // Changed to string
  };
}

interface ProjectWithTime extends Project {
  loggedHours: number;
  balance: number;
}

// Helper function to parse ISO 8601 duration (e.g., "PT2H6M17S") to seconds
function parseISO8601Duration(duration: string): number {
  const regex = /P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const matches = duration.match(regex);

  if (!matches) {
    return 0;
  }

  const days = parseInt(matches[1] || '0', 10);
  const hours = parseInt(matches[2] || '0', 10);
  const minutes = parseInt(matches[3] || '0', 10);
  const seconds = parseInt(matches[4] || '0', 10);

  return (days * 24 * 3600) + (hours * 3600) + (minutes * 60) + seconds;
}

@Component({
  selector: 'app-dashboard',
  standalone: true, // Ensure standalone is true
  imports: [CommonModule, MatCardModule, MatGridListModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard implements OnInit {
  private projectService = inject(ProjectService);
  private clockifyService = inject(ClockifyService);

  projects = signal<ProjectWithTime[]>([]);

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    console.log('Dashboard: Loading data...');
    const settings = JSON.parse(localStorage.getItem('work-sync-settings') || 'null');
    console.log('Dashboard: Settings from localStorage:', settings);

    if (settings && settings.apiKey && settings.workspaceId && settings.userId) {
      // Calculate start and end of the current week
      const today = new Date();
      const dayOfWeek = today.getDay(); // Sunday - 0, Monday - 1, ..., Saturday - 6
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - dayOfWeek); // Go back to Sunday
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(today);
      endOfWeek.setDate(today.getDate() + (6 - dayOfWeek)); // Go forward to Saturday
      endOfWeek.setHours(23, 59, 59, 999);

      const start = startOfWeek.toISOString();
      const end = endOfWeek.toISOString();
      console.log('Dashboard: Date range:', { start, end });

      this.projectService.getProjects().subscribe(projects => {
        console.log('Dashboard: Projects from Supabase:', projects);
        if (!projects || projects.length === 0) {
          console.log('Dashboard: No projects found in Supabase.');
          this.projects.set([]); // Ensure signal is updated even if no projects
          return;
        }

        this.clockifyService.getTimeEntries(settings.apiKey, settings.workspaceId, settings.userId, start, end).subscribe((timeEntries: TimeEntry[]) => {
          console.log('Dashboard: Time entries from Clockify:', timeEntries);
          if (!timeEntries || timeEntries.length === 0) {
            console.log('Dashboard: No time entries found for the current week.');
            // Display projects with 0 logged hours if no time entries
            const projectsWithZeroTime: ProjectWithTime[] = projects.map(p => ({
              ...p,
              loggedHours: 0,
              balance: p.target_hours,
            }));
            this.projects.set(projectsWithZeroTime);
            return;
          }

          const projectsWithTime: ProjectWithTime[] = projects.map(p => {
            const filteredTimeEntries = timeEntries.filter(te => p.clockify_project_id && te.projectId === p.clockify_project_id);
            console.log(`Dashboard: Filtered time entries for project ${p.name} (${p.clockify_project_id}):`, filteredTimeEntries);

            const totalDurationSeconds = filteredTimeEntries
              .reduce((acc, te) => acc + parseISO8601Duration(te.timeInterval.duration), 0);

            const loggedHours = totalDurationSeconds / 3600;

            return {
              ...p,
              loggedHours: Math.round(loggedHours * 100) / 100,
              balance: Math.round((p.target_hours - loggedHours) * 100) / 100,
            };
          });
          console.log('Dashboard: Final projects with time:', projectsWithTime);
          this.projects.set(projectsWithTime);
          console.log('Dashboard: Projects signal after set:', this.projects()); // Added log
        });
      });
    } else {
      console.log('Dashboard: Settings are not fully configured.');
      this.projects.set([]); // Ensure signal is empty if settings are not configured
    }
  }
}