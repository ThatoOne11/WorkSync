import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Project } from '../models/project.model';
import { from } from 'rxjs';

const BROWSER_ID_KEY = 'workSyncBrowserId';

@Injectable({
  providedIn: 'root',
})
export class ProjectService {
  private supabase = inject(SupabaseService).supabase;
  private getBrowserId = () => localStorage.getItem(BROWSER_ID_KEY);

  getProjects() {
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

  addProject(project: Partial<Project>) {
    const browserId = this.getBrowserId();
    if (!browserId) throw new Error('Cannot add project without a browser ID.');

    const projectWithUser = { ...project, user_id: browserId };
    const promise = this.supabase
      .from('projects')
      .insert(projectWithUser)
      .then();
    return from(promise);
  }

  updateProject(id: number, updates: Partial<Project>) {
    const browserId = this.getBrowserId();
    if (!browserId)
      throw new Error('Cannot update project without a browser ID.');

    const promise = this.supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .eq('user_id', browserId)
      .then();
    return from(promise);
  }

  deleteProject(id: number) {
    const browserId = this.getBrowserId();
    if (!browserId)
      throw new Error('Cannot delete project without a browser ID.');

    const promise = this.supabase
      .from('projects')
      .delete()
      .eq('id', id)
      .eq('user_id', browserId)
      .then();
    return from(promise);
  }

  archiveAllProjects() {
    const browserId = this.getBrowserId();
    if (!browserId)
      throw new Error('Cannot archive projects without a browser ID.');

    // FIX: Chain the query to ensure you only archive your own projects.
    const promise = this.supabase
      .from('projects')
      .update({ is_archived: true })
      .eq('is_archived', false)
      .eq('user_id', browserId) // Security check
      .then();
    return from(promise);
  }
}
