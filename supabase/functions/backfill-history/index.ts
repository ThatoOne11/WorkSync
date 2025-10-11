import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

function parseDuration(isoDuration: string): number {
  if (!isoDuration || !isoDuration.startsWith('PT')) return 0;
  const timeStr = isoDuration.substring(2);
  let hours = 0,
    minutes = 0,
    seconds = 0;
  const hourMatch = timeStr.match(/(\d+)H/);
  if (hourMatch) hours = parseInt(hourMatch[1]);
  const minuteMatch = timeStr.match(/(\d+)M/);
  if (minuteMatch) minutes = parseInt(minuteMatch[1]);
  const secondMatch = timeStr.match(/(\d+)S/);
  if (secondMatch) seconds = parseInt(secondMatch[1]);
  return hours * 3600 + minutes * 60 + seconds;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // FIX: Read settings and browserId from the request body
    const { settings, browserId } = await req.json();
    if (!settings || !browserId) {
      throw new Error('Settings or Browser ID not provided.');
    }
    const {
      apiKey: clockifyApiKey,
      workspaceId: clockifyWorkspaceId,
      userId: clockifyUserId,
    } = settings;

    if (!clockifyApiKey || !clockifyWorkspaceId || !clockifyUserId) {
      throw new Error('Clockify settings are not configured.');
    }

    // FIX: Filter projects by the provided browserId
    const { data: projects } = await supabase
      .from('projects')
      .select('id, name, clockify_project_id, target_hours')
      .eq('user_id', browserId);

    if (!projects) throw new Error('No projects found for this user.');

    const allSummaries = [];
    const weeksToBackfill = 12;

    for (let i = 0; i < weeksToBackfill; i++) {
      const today = new Date();
      const endOfWeek = new Date(today);
      endOfWeek.setDate(today.getDate() - today.getDay() - 7 * i);
      endOfWeek.setHours(23, 59, 59, 999);

      const startOfWeek = new Date(endOfWeek);
      startOfWeek.setDate(startOfWeek.getDate() - 6);
      startOfWeek.setHours(0, 0, 0, 0);

      const start = startOfWeek.toISOString();
      const end = endOfWeek.toISOString();
      const week_ending_on = endOfWeek.toISOString().split('T')[0];

      const timeEntriesUrl = `https://api.clockify.me/api/v1/workspaces/${clockifyWorkspaceId}/user/${clockifyUserId}/time-entries?start=${start}&end=${end}&page-size=5000`;
      const clockifyResponse = await fetch(timeEntriesUrl, {
        headers: { 'X-Api-Key': clockifyApiKey },
      });
      const timeEntries = await clockifyResponse.json();

      if (!Array.isArray(timeEntries)) continue;

      const weeklySummaries = projects.map((project) => {
        const loggedSeconds = timeEntries
          .filter((te: any) => te.projectId === project.clockify_project_id)
          .reduce(
            (sum: number, te: any) =>
              sum + parseDuration(te.timeInterval.duration),
            0
          );

        const loggedHours = loggedSeconds / 3600;

        // FIX: Include the user_id in the summary object
        return {
          project_id: project.id,
          target_hours: project.target_hours,
          logged_hours: loggedHours,
          week_ending_on: week_ending_on,
          user_id: browserId,
        };
      });

      allSummaries.push(...weeklySummaries);
    }

    const { error: insertError } = await supabase
      .from('weekly_summaries')
      .upsert(allSummaries, { onConflict: 'project_id,week_ending_on' });

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({
        message: `Successfully backfilled ${allSummaries.length} historical records.`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
