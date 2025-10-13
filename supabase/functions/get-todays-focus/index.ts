import { createClient } from '@supabase/supabase-js';
import { serve } from '@deno/server';
import { corsHeaders } from '../_shared/cors.ts';

// Helper function to count remaining weekdays in the month
function getRemainingWorkdays(today) {
  let remainingWorkdays = 0;
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let day = today.getDate(); day <= daysInMonth; day++) {
    const currentDate = new Date(year, month, day);
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek > 0 && dayOfWeek < 6) {
      // Monday to Friday
      remainingWorkdays++;
    }
  }
  return remainingWorkdays > 0 ? remainingWorkdays : 1; // Avoid division by zero
}

// Re-usable duration parser
function parseISO8601Duration(duration: string): number {
  if (!duration) return 0;
  const regex = /P(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)/;
  const matches = duration.match(regex);
  if (!matches) return 0;
  const hours = parseFloat(matches[1] || '0');
  const minutes = parseFloat(matches[2] || '0');
  const seconds = parseFloat(matches[3] || '0');
  return hours * 3600 + minutes * 60 + seconds;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { settings, browserId } = await req.json();
    if (!settings || !browserId) {
      throw new Error(
        'Settings or Browser ID were not provided in the request body.'
      );
    }
    const {
      apiKey: clockifyApiKey,
      workspaceId: clockifyWorkspaceId,
      userId: clockifyUserId,
    } = settings;

    if (!clockifyApiKey || !clockifyWorkspaceId || !clockifyUserId)
      throw new Error('Clockify settings missing.');

    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('name, target_hours, clockify_project_id')
      .eq('is_archived', false)
      .eq('user_id', browserId);

    if (projectsError) throw projectsError;

    const today = new Date();

    // Determine if today is a weekend (0=Sunday, 6=Saturday)
    const dayOfWeek = today.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // If it's a weekend, the daily focus is zero. We still return the list, but with 0 hours.
    if (isWeekend) {
      return new Response(JSON.stringify({ focusList: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const startOfMonth = new Date(
      today.getFullYear(),
      today.getMonth(),
      1
    ).toISOString();

    const timeEntriesUrl = `https://api.clockify.me/api/v1/workspaces/${clockifyWorkspaceId}/user/${clockifyUserId}/time-entries?start=${startOfMonth}&end=${today.toISOString()}&page-size=5000`;
    const clockifyResponse = await fetch(timeEntriesUrl, {
      headers: { 'X-Api-Key': clockifyApiKey },
    });
    const timeEntries = await clockifyResponse.json();

    const remainingWorkdays = getRemainingWorkdays(today);

    const focusList = projects
      .map((p) => {
        const loggedSeconds = timeEntries
          .filter((te) => te.projectId === p.clockify_project_id)
          .reduce(
            (sum, te) => sum + parseISO8601Duration(te.timeInterval.duration),
            0
          );

        const loggedHours = loggedSeconds / 3600;
        const remainingHours = p.target_hours - loggedHours;
        const requiredDailyPace =
          remainingHours > 0 ? remainingHours / remainingWorkdays : 0;

        return {
          name: p.name,
          requiredHoursToday: Math.round(requiredDailyPace * 100) / 100,
        };
      })
      .filter((p) => p.requiredHoursToday > 0);

    return new Response(JSON.stringify({ focusList }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
