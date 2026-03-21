export const SUPABASE_TABLES = {
  PROJECTS: 'projects',
  SETTINGS: 'user_settings',
  WEEKLY_SUMMARIES: 'weekly_summaries',
  PACING_ALERTS: 'pacing_alerts',
} as const;

export const SUPABASE_RPCS = {
  UPSERT_USER_SETTINGS: 'upsert_user_settings',
  GET_DECRYPTED_CLOCKIFY_KEY: 'get_decrypted_clockify_key',
} as const;
