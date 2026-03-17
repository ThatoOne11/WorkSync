import { z } from 'npm:zod';

export const GetTodaysFocusSchema = z.object({
  settings: z.object({
    apiKey: z.string().min(1),
    workspaceId: z.string().min(1),
    userId: z.string().min(1),
  }),
  browserId: z.string().min(1),
});

export type GetTodaysFocusRequest = z.infer<typeof GetTodaysFocusSchema>;

export type FocusProjectResult = {
  name: string;
  requiredHoursToday: number;
};
