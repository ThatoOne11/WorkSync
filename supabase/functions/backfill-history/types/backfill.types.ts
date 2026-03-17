import { z } from 'npm:zod';

export const HistoricalTargetSchema = z
  .object({
    projectId: z.number(),
    projectName: z.string(),
  })
  .catchall(z.union([z.number(), z.string(), z.null()]));

export type HistoricalTarget = z.infer<typeof HistoricalTargetSchema>;

export const BackfillRequestSchema = z.object({
  settings: z.object({
    apiKey: z.string().min(1),
    workspaceId: z.string().min(1),
    userId: z.string().min(1),
  }),
  browserId: z.string().min(1),
  historicalTargets: z.array(HistoricalTargetSchema),
});

export type BackfillRequest = z.infer<typeof BackfillRequestSchema>;
