import { Injectable, inject } from '@angular/core';
import { from, Observable } from 'rxjs';
import { z } from 'zod';
import { SettingsService } from '../../../core/services/settings.service';
import { SUPABASE_TABLES } from '../../../shared/constants/supabase.constants';
import { Project, ProjectSchema } from '../../../shared/schemas/app.schemas';
import { SupabaseService } from '../../../core/services/supabase.service';

@Injectable({
  providedIn: 'root',
})
export class ProjectService {
  private readonly supabase = inject(SupabaseService).supabase;
  private readonly settingsService = inject(SettingsService);

  getProjects(): Observable<Project[]> {
    const browserId = this.settingsService.getBrowserId();
    if (!browserId) return from(Promise.resolve([]));

    const promise = this.supabase
      .from(SUPABASE_TABLES.PROJECTS)
      .select('*')
      .eq('is_archived', false)
      .eq('user_id', browserId)
      .then(({ data, error }) => {
        if (error) throw error;
        return z.array(ProjectSchema).parse(data);
      });

    return from(promise);
  }

  addProject(project: Partial<Project>): Observable<void> {
    const browserId = this.settingsService.getBrowserId();
    if (!browserId) throw new Error('Cannot add project without a browser ID.');
    if (!project.clockify_project_id)
      throw new Error('Project must have a Clockify ID.');

    const promise = this.supabase
      .from(SUPABASE_TABLES.PROJECTS)
      .select('id')
      .eq('user_id', browserId)
      .eq('clockify_project_id', project.clockify_project_id)
      .eq('is_archived', true)
      .limit(1)
      .maybeSingle()
      .then(async ({ data: archivedProject, error }) => {
        if (error) throw error;

        if (archivedProject) {
          const { error: updateError } = await this.supabase
            .from(SUPABASE_TABLES.PROJECTS)
            .update({ is_archived: false, target_hours: project.target_hours })
            .eq('id', archivedProject.id)
            .eq('user_id', browserId);
          if (updateError) throw updateError;
        } else {
          const { error: insertError } = await this.supabase
            .from(SUPABASE_TABLES.PROJECTS)
            .insert({ ...project, user_id: browserId, is_archived: false });
          if (insertError) throw insertError;
        }
      });

    return from(promise);
  }

  updateProject(id: number, updates: Partial<Project>): Observable<void> {
    const browserId = this.settingsService.getBrowserId();
    if (!browserId)
      throw new Error('Cannot update project without a browser ID.');

    const promise = this.supabase
      .from(SUPABASE_TABLES.PROJECTS)
      .update(updates)
      .eq('id', id)
      .eq('user_id', browserId)
      .then(({ error }) => {
        if (error) throw error;
      });

    return from(promise);
  }

  deleteProject(id: number): Observable<void> {
    const browserId = this.settingsService.getBrowserId();
    if (!browserId)
      throw new Error('Cannot delete project without a browser ID.');

    const promise = this.supabase
      .from(SUPABASE_TABLES.PROJECTS)
      .delete()
      .eq('id', id)
      .eq('user_id', browserId)
      .then(({ error }) => {
        if (error) throw error;
      });

    return from(promise);
  }

  archiveAllProjects(): Observable<void> {
    const browserId = this.settingsService.getBrowserId();
    if (!browserId)
      throw new Error('Cannot archive projects without a browser ID.');

    const promise = this.supabase
      .from(SUPABASE_TABLES.PROJECTS)
      .update({ is_archived: true })
      .eq('is_archived', false)
      .eq('user_id', browserId)
      .then(({ error }) => {
        if (error) throw error;
      });

    return from(promise);
  }
}
