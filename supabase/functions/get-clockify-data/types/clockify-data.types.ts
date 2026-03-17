import { z } from 'npm:zod';

export const GetClockifyDataSchema = z.object({
  action: z.enum(['getCurrentUserId', 'getTimeEntries', 'getClockifyProjects']),
  apiKey: z.string().min(1),
  workspaceId: z.string().optional(),
  userId: z.string().optional(),
  start: z.string().optional(),
  end: z.string().optional(),
});

export type GetClockifyDataRequest = z.infer<typeof GetClockifyDataSchema>;
