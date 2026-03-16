import { z } from 'npm:zod';

export const DeleteUserDataSchema = z.object({
  browserId: z.string().min(1),
});

export type DeleteUserDataRequest = z.infer<typeof DeleteUserDataSchema>;
