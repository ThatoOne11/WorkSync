import { z } from 'zod';

export const AppSettingsSchema = z.object({
  apiKey: z.string().default(''),
  workspaceId: z.string().default(''),
  userId: z.string().default(''),
  notificationEmail: z.string().email().or(z.literal('')).default(''),
  enableEmailNotifications: z.boolean().default(false),
  enablePacingAlerts: z.boolean().default(false),
});

export const ProjectSchema = z.object({
  id: z.number(),
  name: z.string(),
  target_hours: z.number(),
  created_at: z.string(),
  clockify_project_id: z.string().optional(),
  is_archived: z.boolean().default(false),
  user_id: z.string().uuid().optional(),
});

export const ClockifyUserSchema = z.object({
  id: z.string(),
});

export const HistoricalTargetSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.null()]),
);

export type AppSettings = z.infer<typeof AppSettingsSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type ClockifyUser = z.infer<typeof ClockifyUserSchema>;
export type HistoricalTarget = z.infer<typeof HistoricalTargetSchema>;
