import { z } from 'npm:zod';

export const UserSettingsSchema = z
  .object({
    user_id: z.string(),
    enableEmailNotifications: z.string().optional(),
    enablePacingAlerts: z.string().optional(),
    notificationEmail: z.string().optional(),
    clockifyApiKey: z.string().optional(),
    clockifyWorkspaceId: z.string().optional(),
    clockifyUserId: z.string().optional(),
  })
  .catchall(z.string().optional());

export type UserSettings = z.infer<typeof UserSettingsSchema>;

export type ProjectSummary = {
  project_id: number;
  project_name: string;
  target_hours: number;
  logged_hours: number;
  balance: number;
  week_ending_on: string;
  user_id: string;
  recommended_hours?: number;
};

export type WeeklyStats = {
  weeklyLoggedHours: number;
  recommendedWeeklyHours: number;
  weeklyBalance: number;
  overallStatus: 'On Pace' | 'Over Shooting' | 'Under Shooting';
  peakDay: string;
  peakHours: number;
  topProject: string;
  topProjectShare: number;
};

export type ProjectAnalysis = {
  id: number;
  name: string;
  variance: number;
};
