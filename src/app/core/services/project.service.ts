import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Project } from '../models/project.model';
import { from, Observable } from 'rxjs';

const BROWSER_ID_KEY = 'workSyncBrowserId';

@Injectable({
  providedIn: 'root',
})
export class ProjectService {
  private supabase = inject(SupabaseService).supabase;
  private getBrowserId = (): string | null =>
    localStorage.getItem(BROWSER_ID_KEY);

  getProjects(): Observable<Project[]> {
    const browserId = this.getBrowserId();
    if (!browserId) return from(Promise.resolve([] as Project[]));

    const promise = this.supabase
      .from('projects')
      .select('*')
      .eq('is_archived', false)
      .eq('user_id', browserId) // Filter by browser ID
      .then(({ data }) => data as Project[]);
    return from(promise);
  }

  addProject(project: Partial<Project>): Observable<void> {
    const browserId = this.getBrowserId();
    if (!browserId) throw new Error('Cannot add project without a browser ID.');
    if (!project.clockify_project_id)
      throw new Error('Project must have a Clockify ID.');

    // FIX: 1. Check for an archived project with the same clockify ID to preserve history.
    const findArchivedPromise = this.supabase
      .from('projects')
      .select('id')
      .eq('user_id', browserId)
      .eq('clockify_project_id', project.clockify_project_id)
      .eq('is_archived', true)
      .limit(1)
      .single()
      .then(({ data, error }) => {
        // PGRST116 is the error code for "no rows found" from PostgREST. If it's another error, throw.
        if (error && error.code !== 'PGRST116') throw error;
        return data;
      });

    const promise = findArchivedPromise.then(async (archivedProject) => {
      if (archivedProject) {
        // If found, unarchive the existing project and update its target_hours.
        const updatePayload = {
          is_archived: false,
          target_hours: project.target_hours,
        };
        const { error } = await this.supabase
          .from('projects')
          .update(updatePayload)
          .eq('id', archivedProject.id)
          .eq('user_id', browserId);

        if (error) throw error;
      } else {
        // Otherwise, insert a brand new project.
        const projectWithUser = {
          ...project,
          user_id: browserId,
          is_archived: false,
        };
        const { error } = await this.supabase
          .from('projects')
          .insert(projectWithUser);

        if (error) throw error;
      }
      return; // Ensure return is void
    });

    return from(promise);
  }

  updateProject(id: number, updates: Partial<Project>): Observable<void> {
    const browserId = this.getBrowserId();
    if (!browserId)
      throw new Error('Cannot update project without a browser ID.');

    const promise = this.supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .eq('user_id', browserId)
      .then(() => {}); // FIX: Explicitly resolve the promise to void
    return from(promise);
  }

  deleteProject(id: number): Observable<void> {
    const browserId = this.getBrowserId();
    if (!browserId)
      throw new Error('Cannot delete project without a browser ID.');

    const promise = this.supabase
      .from('projects')
      .delete()
      .eq('id', id)
      .eq('user_id', browserId)
      .then(() => {}); // FIX: Explicitly resolve the promise to void
    return from(promise);
  }

  archiveAllProjects(): Observable<void> {
    const browserId = this.getBrowserId();
    if (!browserId)
      throw new Error('Cannot archive projects without a browser ID.');

    const promise = this.supabase
      .from('projects')
      .update({ is_archived: true })
      .eq('is_archived', false)
      .eq('user_id', browserId) // Security check
      .then(() => {}); // FIX: Explicitly resolve the promise to void
    return from(promise);
  }
}
