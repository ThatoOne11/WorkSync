import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js';
import { SupabaseTables } from '../constants/supabase.constants.ts';

export interface DBProject {
  id: number;
  name: string;
  target_hours: number;
  clockify_project_id: string;
}

export class ProjectsRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getActiveProjects(userId: string): Promise<DBProject[]> {
    const { data, error } = await this.client
      .from(SupabaseTables.PROJECTS)
      .select('id, name, target_hours, clockify_project_id')
      .eq('is_archived', false)
      .eq('user_id', userId);

    if (error)
      throw new Error(`DB Error (Projects fetch active): ${error.message}`);
    return data || [];
  }

  async getProjectById(projectId: number, userId: string): Promise<DBProject> {
    const { data, error } = await this.client
      .from(SupabaseTables.PROJECTS)
      .select('id, name, target_hours, clockify_project_id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (error)
      throw new Error(`DB Error (Project fetch single): ${error.message}`);
    return data;
  }

  async deleteUserData(userId: string): Promise<void> {
    const { error } = await this.client
      .from(SupabaseTables.PROJECTS)
      .delete()
      .eq('user_id', userId);

    if (error) throw new Error(`DB Error (Projects delete): ${error.message}`);
  }
}
