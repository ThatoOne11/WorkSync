import { z } from 'npm:zod';

export const SyncSettingsRequestSchema = z.object({
  settings: z.object({
    apiKey: z.string().optional(),
    workspaceId: z.string().optional(),
    userId: z.string().optional(),
    notificationEmail: z.string().optional(),
    enableEmailNotifications: z.boolean().optional(),
    enablePacingAlerts: z.boolean().optional(),
  }),
  browserId: z.string().min(1),
});

export type SyncSettingsRequest = z.infer<typeof SyncSettingsRequestSchema>;
