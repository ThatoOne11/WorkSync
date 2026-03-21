import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js';
import { SUPABASE_TABLES } from '../constants/supabase.constants.ts';

export type DBWeeklySummary = {
  week_ending_on: string;
  logged_hours: number;
  target_hours: number;
  project_id?: number;
  user_id: string;
};

export class SummariesRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getSummariesByProject(
    projectId: number,
    userId: string,
  ): Promise<DBWeeklySummary[]> {
    const { data, error } = await this.client
      .from(SUPABASE_TABLES.WEEKLY_SUMMARIES)
      .select('week_ending_on, logged_hours, target_hours, project_id, user_id')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .order('week_ending_on', { ascending: true });

    if (error) throw new Error(`DB Error (Summaries fetch): ${error.message}`);
    return data || [];
  }

  async upsertSummaries(summaries: DBWeeklySummary[]): Promise<void> {
    if (summaries.length === 0) return;

    const { error } = await this.client
      .from(SUPABASE_TABLES.WEEKLY_SUMMARIES)
      .upsert(summaries, { onConflict: 'project_id,week_ending_on,user_id' });

    if (error) throw new Error(`DB Error (Summaries upsert): ${error.message}`);
  }

  async deleteUserData(userId: string): Promise<void> {
    const { error } = await this.client
      .from(SUPABASE_TABLES.WEEKLY_SUMMARIES)
      .delete()
      .eq('user_id', userId);

    if (error) throw new Error(`DB Error (Summaries delete): ${error.message}`);
  }
}
