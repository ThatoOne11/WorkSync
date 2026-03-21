import { ENV } from '../configs/env.ts';

export function requireServiceRole(req: Request): void {
  // We use Authorization Bearer token matching the Service Role Key
  const authHeader = req.headers
    .get('Authorization')
    ?.replace('Bearer ', '')
    .trim();
  const expectedKey = ENV.SUPABASE_SERVICE_ROLE_KEY.trim();

  if (!authHeader || authHeader !== expectedKey) {
    throw new Error('Unauthorized: Invalid or missing Service Role token.');
  }
}
