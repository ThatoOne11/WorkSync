import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { from } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ClockifyService {
  private supabase = inject(SupabaseService).supabase;

  getTimeEntries(apiKey: string, workspaceId: string, userId: string, start: string, end: string) {
    const promise = this.supabase.functions.invoke('get-clockify-data', {
      body: { action: 'getTimeEntries', apiKey, workspaceId, userId, start, end },
    }).then(({ data }) => data);
    
    return from(promise);
  }

  getCurrentUserId(apiKey: string) {
    const promise = this.supabase.functions.invoke('get-clockify-data', {
      body: { action: 'getCurrentUserId', apiKey },
    }).then(({ data }) => data);

    return from(promise);
  }

  getClockifyProjects(apiKey: string, workspaceId: string) {
    const promise = this.supabase.functions.invoke('get-clockify-data', {
      body: { action: 'getClockifyProjects', apiKey, workspaceId },
    }).then(({ data }) => data);

    return from(promise);
  }
}