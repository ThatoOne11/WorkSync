import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js';
import {
  SUPABASE_TABLES,
  SUPABASE_RPCS,
} from '../constants/supabase.constants.ts';
import { UserSettings } from '../types/app.types.ts';

export class SettingsRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getAllUsersSettings(): Promise<Record<string, UserSettings>> {
    const { data: settings, error } = await this.client
      .from(SUPABASE_TABLES.SETTINGS)
      .select('*');

    if (error) throw new Error(`DB Error (Settings fetch): ${error.message}`);
    if (!settings) return {};

    const result: Record<string, UserSettings> = {};

    for (const row of settings) {
      let decryptedKey = '';
      if (row.clockify_api_key_id) {
        // Securely fetch decrypted key (Only works if client uses Service Role)
        const { data: keyData } = await this.client.rpc(
          SUPABASE_RPCS.GET_DECRYPTED_CLOCKIFY_KEY,
          {
            p_user_id: row.user_id,
          },
        );
        decryptedKey = keyData || '';
      }

      result[row.user_id] = {
        user_id: row.user_id,
        notificationEmail: row.notification_email,
        enableEmailNotifications: String(row.enable_email_notifications),
        enablePacingAlerts: String(row.enable_pacing_alerts),
        clockifyWorkspaceId: row.clockify_workspace_id,
        clockifyUserId: row.clockify_user_id,
        clockifyApiKey: decryptedKey,
      };
    }

    return result;
  }

  async getUserSettings(userId: string): Promise<UserSettings | null> {
    const { data: row, error } = await this.client
      .from(SUPABASE_TABLES.SETTINGS)
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`DB Error (Settings fetch single): ${error.message}`);
    }

    let decryptedKey = '';
    if (row.clockify_api_key_id) {
      const { data: keyData } = await this.client.rpc(
        SUPABASE_RPCS.GET_DECRYPTED_CLOCKIFY_KEY,
        {
          p_user_id: userId,
        },
      );
      decryptedKey = keyData || '';
    }

    return {
      user_id: row.user_id,
      notificationEmail: row.notification_email,
      enableEmailNotifications: String(row.enable_email_notifications),
      enablePacingAlerts: String(row.enable_pacing_alerts),
      clockifyWorkspaceId: row.clockify_workspace_id,
      clockifyUserId: row.clockify_user_id,
      clockifyApiKey: decryptedKey,
    };
  }

  async upsertSettings(
    userId: string,
    settings: Partial<UserSettings>,
  ): Promise<void> {
    // Calls the secure RPC which throws the raw API key into the Vault
    const { error } = await this.client.rpc(
      SUPABASE_RPCS.UPSERT_USER_SETTINGS,
      {
        p_user_id: userId,
        p_email: settings.notificationEmail || null,
        p_enable_email: settings.enableEmailNotifications === 'true',
        p_enable_pacing: settings.enablePacingAlerts === 'true',
        p_workspace_id: settings.clockifyWorkspaceId || null,
        p_clockify_user_id: settings.clockifyUserId || null,
        p_api_key: settings.clockifyApiKey || null,
      },
    );

    if (error)
      throw new Error(`DB Error (Settings upsert RPC): ${error.message}`);
  }

  async deleteUserData(userId: string): Promise<void> {
    const { error } = await this.client
      .from(SUPABASE_TABLES.SETTINGS)
      .delete()
      .eq('user_id', userId);

    if (error) throw new Error(`DB Error (Settings delete): ${error.message}`);
  }
}
