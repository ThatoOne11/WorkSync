import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js';
import { SupabaseTables } from '../constants/supabase.constants.ts';
import { UserSettings } from '../types/app.types.ts';

export class SettingsRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getAllUsersSettings(): Promise<Record<string, UserSettings>> {
    const { data, error } = await this.client
      .from(SupabaseTables.SETTINGS)
      .select('key, value, user_id');

    if (error) throw new Error(`DB Error (Settings fetch): ${error.message}`);
    if (!data) return {};

    return data.reduce(
      (acc, { key, value, user_id }) => {
        acc[user_id] = acc[user_id] || { user_id };
        acc[user_id][key] = value;
        return acc;
      },
      {} as Record<string, UserSettings>,
    );
  }

  async upsertSettings(
    userId: string,
    settings: Partial<UserSettings>,
  ): Promise<void> {
    const updates = [
      { key: 'clockifyApiKey', value: settings.clockifyApiKey || '' },
      { key: 'clockifyWorkspaceId', value: settings.clockifyWorkspaceId || '' },
      { key: 'clockifyUserId', value: settings.clockifyUserId || '' },
      { key: 'notificationEmail', value: settings.notificationEmail || '' },
      {
        key: 'enableEmailNotifications',
        value: String(settings.enableEmailNotifications),
      },
      { key: 'enablePacingAlerts', value: String(settings.enablePacingAlerts) },
    ].map((item) => ({ ...item, user_id: userId }));

    const { error } = await this.client
      .from(SupabaseTables.SETTINGS)
      .upsert(updates, { onConflict: 'user_id, key' });

    if (error) throw new Error(`DB Error (Settings upsert): ${error.message}`);
  }

  async deleteUserData(userId: string): Promise<void> {
    const { error } = await this.client
      .from(SupabaseTables.SETTINGS)
      .delete()
      .eq('user_id', userId);

    if (error) throw new Error(`DB Error (Settings delete): ${error.message}`);
  }
}
