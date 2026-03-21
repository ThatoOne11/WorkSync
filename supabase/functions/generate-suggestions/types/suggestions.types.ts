import { z } from 'npm:zod';

export const GenerateSuggestionsSchema = z
  .object({
    browserId: z.string().min(1),
  })
  .catchall(z.any());

export type ProjectVarianceContext = {
  name: string;
  loggedHours: number;
  targetHours: number;
  variance: number;
};

export type GenerateSuggestionsRequest = z.infer<
  typeof GenerateSuggestionsSchema
>;
