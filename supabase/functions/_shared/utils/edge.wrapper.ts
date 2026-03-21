import { corsHeaders } from '../configs/cors.ts';
import { toSafeError } from './error.utils.ts';

export function withEdgeWrapper(
  functionName: string,
  handler: (req: Request) => Promise<Response>,
) {
  return async (req: Request) => {
    // 1. Handle CORS Preflight automatically
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    try {
      // 2. Execute the actual function logic
      return await handler(req);
    } catch (err: unknown) {
      // 3. Centralized Error Handling
      const error = toSafeError(err);
      console.error(`[${functionName}] Execution Error:`, error.message);

      const status = error.name === 'ValidationError' ? 400 : 500;

      return new Response(
        JSON.stringify({
          success: false,
          error: error.message,
        }),
        {
          status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }
  };
}
