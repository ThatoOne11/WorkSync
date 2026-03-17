export const SUPABASE_FUNCTIONS = {
  GET_CLOCKIFY_DATA: 'get-clockify-data',
  BACKFILL_HISTORY: 'backfill-history',
  GET_PROJECT_HISTORY: 'get-project-history',
  SYNC_SETTINGS: 'sync-settings',
  DELETE_USER_DATA: 'delete-user-data',
  CREATE_WEEKLY_SUMMARIES: 'create-weekly-summaries',
  GENERATE_SUGGESTIONS: 'generate-suggestions',
  GET_TODAYS_FOCUS: 'get-todays-focus',
} as const;

export const SUPABASE_TABLES = {
  PROJECTS: 'projects',
  WEEKLY_SUMMARIES: 'weekly_summaries',
} as const;
