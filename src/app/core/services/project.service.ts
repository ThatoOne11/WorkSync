import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Project } from '../models/project.model';
import { from } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ProjectService {
  private supabase = inject(SupabaseService).supabase;

  getProjects() {
    // --- THIS IS THE KEY CHANGE: Only select projects that are NOT archived ---
    const promise = this.supabase
      .from('projects')
      .select('*')
      .eq('is_archived', false) // Add this filter
      .then(({ data }) => data as Project[]);
    // --- END OF CHANGE ---
    return from(promise);
  }

  addProject(project: Partial<Project>) {
    const promise = this.supabase.from('projects').insert(project).then();
    return from(promise);
  }

  updateProject(id: number, updates: Partial<Project>) {
    const promise = this.supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .then();
    return from(promise);
  }

  deleteProject(id: number) {
    const promise = this.supabase.from('projects').delete().eq('id', id).then();
    return from(promise);
  }

  // --- NEW FUNCTION for Archiving ---
  archiveAllProjects() {
    const promise = this.supabase
      .from('projects')
      .update({ is_archived: true })
      .eq('is_archived', false) // Only archive currently active projects
      .then();
    return from(promise);
  }
}
