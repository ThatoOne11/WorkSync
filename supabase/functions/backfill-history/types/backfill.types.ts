import { z } from 'npm:zod';

export const HistoricalTargetSchema = z
  .object({
    projectId: z.number(),
    projectName: z.string(),
  })
  .catchall(z.union([z.number(), z.string(), z.null()]));

export type HistoricalTarget = z.infer<typeof HistoricalTargetSchema>;

export const BackfillRequestSchema = z
  .object({
    browserId: z.string().min(1),
    historicalTargets: z.array(HistoricalTargetSchema),
  })
  .catchall(z.any());

export type BackfillRequest = z.infer<typeof BackfillRequestSchema>;
