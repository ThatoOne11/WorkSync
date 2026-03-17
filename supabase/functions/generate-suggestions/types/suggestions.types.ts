import { z } from 'npm:zod';

export const GenerateSuggestionsSchema = z.object({
  settings: z.object({
    apiKey: z.string().min(1),
    workspaceId: z.string().min(1),
    userId: z.string().min(1),
  }),
  browserId: z.string().min(1),
});

export type GenerateSuggestionsRequest = z.infer<
  typeof GenerateSuggestionsSchema
>;
