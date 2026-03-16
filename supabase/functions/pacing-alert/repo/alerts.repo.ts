import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js';
import { SupabaseTables } from '../../_shared/constants/supabase.constants.ts';

export class AlertsRepository {
  constructor(private readonly client: SupabaseClient) {}

  async upsertAlerts(
    alerts: { project_id: number; user_id: string; alert_sent_at: string }[],
  ): Promise<void> {
    if (alerts.length === 0) return;

    const { error } = await this.client
      .from(SupabaseTables.PACING_ALERTS)
      .upsert(alerts, { onConflict: 'project_id, user_id' });

    if (error) throw new Error(`DB Error (Alerts upsert): ${error.message}`);
  }
}
