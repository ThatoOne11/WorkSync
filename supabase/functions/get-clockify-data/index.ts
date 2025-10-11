import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createJsonResponse, createErrorResponse } from '../_shared/utils.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, apiKey, workspaceId, userId, start, end } =
      await req.json();

    let clockifyUrl = '';
    const headers: HeadersInit = {
      'X-Api-Key': apiKey,
    };

    if (action === 'getCurrentUserId') {
      clockifyUrl = `https://api.clockify.me/api/v1/user`;
    } else if (action === 'getTimeEntries') {
      clockifyUrl = `https://api.clockify.me/api/v1/workspaces/${workspaceId}/user/${userId}/time-entries`;
      const params = new URLSearchParams();
      if (start) params.append('start', start);
      if (end) params.append('end', end);
      params.append('page-size', '5000');
      clockifyUrl += `?${params.toString()}`;
    } else if (action === 'getClockifyProjects') {
      clockifyUrl = `https://api.clockify.me/api/v1/workspaces/${workspaceId}/projects`;
    } else {
      return createErrorResponse('Invalid action', 400);
    }

    const response = await fetch(clockifyUrl, { headers });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch from Clockify API');
    }

    return createJsonResponse(data);
  } catch (error) {
    {
      return createErrorResponse(error.message);
    }
  }
});
