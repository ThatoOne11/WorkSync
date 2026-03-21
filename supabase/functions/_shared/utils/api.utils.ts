import { z } from 'npm:zod';
import {
  DownstreamSyncError,
  ValidationError,
} from '../exceptions/custom.exceptions.ts';
import { toSafeError } from './error.utils.ts';
import { corsHeaders } from '../configs/cors.ts';

// Safely fetches an API endpoint with automatic exponential backoff for 429 Too Many Requests.
export async function fetchWithBackoff(
  url: string,
  options: RequestInit,
  maxRetries = 3,
): Promise<Response> {
  let attempt = 0;
  let delayMs = 500;

  while (attempt < maxRetries) {
    const response = await fetch(url, options);

    if (response.status === 429) {
      attempt++;
      console.warn(
        `[429 Too Many Requests] Retrying ${url} in ${delayMs}ms...`,
      );
      await new Promise((res) => setTimeout(res, delayMs));
      delayMs *= 2;
      continue;
    }

    return response;
  }

  throw new DownstreamSyncError(
    `Exceeded max retries (${maxRetries}) for ${url}`,
  );
}

export async function parseRequest<T>(
  req: Request,
  schema: z.ZodType<T>,
): Promise<T> {
  try {
    const rawBody = await req.json();
    return schema.parse(rawBody);
  } catch (err: unknown) {
    throw new ValidationError(`Invalid payload: ${toSafeError(err).message}`);
  }
}

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
