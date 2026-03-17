import { SUPABASE_CONFIG } from '../config.ts';

export function requireServiceRole(req: Request): void {
  // We use Authorization Bearer token matching the Service Role Key
  const authHeader = req.headers
    .get('Authorization')
    ?.replace('Bearer ', '')
    .trim();
  const expectedKey = SUPABASE_CONFIG.serviceRoleKey.trim();

  if (!authHeader || authHeader !== expectedKey) {
    throw new Error('Unauthorized: Invalid or missing Service Role token.');
  }
}
