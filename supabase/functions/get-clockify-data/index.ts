import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, apiKey, workspaceId, userId, start, end } =
      await req.json();

    let clockifyUrl = '';
    let headers: HeadersInit = {
      'X-Api-Key': apiKey,
    };

    if (action === 'getCurrentUserId') {
      clockifyUrl = `https://api.clockify.me/api/v1/user`;
    } else if (action === 'getTimeEntries') {
      clockifyUrl = `https://api.clockify.me/api/v1/workspaces/${workspaceId}/user/${userId}/time-entries`;
      const params = new URLSearchParams();
      if (start) {
        params.append('start', start);
      }
      if (end) {
        params.append('end', end);
      }
      params.append('page-size', '500');
      if (params.toString()) {
        clockifyUrl += `?${params.toString()}`;
      }
    } else if (action === 'getClockifyProjects') {
      clockifyUrl = `https://api.clockify.me/api/v1/workspaces/${workspaceId}/projects`;
    } else {
      return new Response(JSON.stringify({ error: 'Invalid action' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const response = await fetch(clockifyUrl, {
      headers: headers,
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
