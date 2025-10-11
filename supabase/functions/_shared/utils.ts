import { corsHeaders } from './cors.ts';

export const createJsonResponse = (data: unknown, status = 200) => {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
};

export const createErrorResponse = (message: string, status = 500) => {
  return createJsonResponse({ error: message }, status);
};
