import { z } from 'npm:zod';

export const GetTodaysFocusSchema = z.object({
  browserId: z.string().min(1),
});

export type GetTodaysFocusRequest = z.infer<typeof GetTodaysFocusSchema>;

export type FocusProjectResult = {
  name: string;
  requiredHoursToday: number;
};
