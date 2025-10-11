import { Injectable, signal, computed } from '@angular/core';
import { Project } from '../models/project.model';
import { AppSettings } from '../services/settings.service';

export interface AppState {
  projects: Project[];
  clockifyProjects: { id: string; name: string }[];
  settings: AppSettings | null;
  isLoading: boolean;
}

const initialState: AppState = {
  projects: [],
  clockifyProjects: [],
  settings: null,
  isLoading: false,
};

@Injectable({
  providedIn: 'root',
})
export class AppStateService {
  private state = signal(initialState);

  // Selectors
  projects = computed(() => this.state().projects);
  clockifyProjects = computed(() => this.state().clockifyProjects);
  settings = computed(() => this.state().settings);
  isLoading = computed(() => this.state().isLoading);

  // Actions
  setProjects(projects: Project[]) {
    this.state.update((state) => ({ ...state, projects }));
  }

  setClockifyProjects(clockifyProjects: { id: string; name: string }[]) {
    this.state.update((state) => ({ ...state, clockifyProjects }));
  }

  setSettings(settings: AppSettings) {
    this.state.update((state) => ({ ...state, settings }));
  }

  setLoading(isLoading: boolean) {
    this.state.update((state) => ({ ...state, isLoading }));
  }
}
