import { z } from 'npm:zod';

export const ClockifyTimeIntervalSchema = z.object({
  start: z.string(),
  end: z.string().nullable().optional(),
  duration: z.string().nullable().optional(),
});

export const ClockifyTimeEntrySchema = z.object({
  id: z.string(),
  projectId: z.string().nullable().optional(),
  timeInterval: ClockifyTimeIntervalSchema,
});

export type ClockifyTimeInterval = z.infer<typeof ClockifyTimeIntervalSchema>;
export type ClockifyTimeEntry = z.infer<typeof ClockifyTimeEntrySchema>;
