import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Project } from '../models/project.model';
import { from } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private supabase = inject(SupabaseService).supabase;

  getProjects() {
    const promise = this.supabase.from('projects').select('*').then(({ data }) => data as Project[]);
    return from(promise);
  }

  addProject(project: Partial<Project>) {
    const promise = this.supabase.from('projects').insert(project).then();
    return from(promise);
  }

  updateProject(id: number, updates: Partial<Project>) {
    const promise = this.supabase.from('projects').update(updates).eq('id', id).then();
    return from(promise);
  }

  deleteProject(id: number) {
    const promise = this.supabase.from('projects').delete().eq('id', id).then();
    return from(promise);
  }
}