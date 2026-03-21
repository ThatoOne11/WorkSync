export function requireServiceRole(req: Request): void {
  const authHeader = req.headers
    .get('Authorization')
    ?.replace('Bearer ', '')
    .trim();

  if (!authHeader) {
    throw new Error('Unauthorized: Missing API token.');
  }
}
