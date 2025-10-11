import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Helper function from the dashboard to parse Clockify's duration format
function parseISO8601Duration(duration: string): number {
  const regex = /P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const matches = duration.match(regex);
  if (!matches) return 0;
  const days = parseInt(matches[1] || '0', 10);
  const hours = parseInt(matches[2] || '0', 10);
  const minutes = parseInt(matches[3] || '0', 10);
  const seconds = parseInt(matches[4] || '0', 10);
  return days * 24 * 3600 + hours * 3600 + minutes * 60 + seconds;
}

serve(async (req) => {
  try {
    // Create a Supabase client with the service role key to bypass RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Fetch settings from the database
    const { data: settingsData, error: settingsError } = await supabase
      .from('settings')
      .select('key, value');

    if (settingsError) throw settingsError;

    const settings = settingsData.reduce((acc, { key, value }) => {
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);

    const { clockifyApiKey, clockifyWorkspaceId, clockifyUserId } = settings;

    if (!clockifyApiKey || !clockifyWorkspaceId || !clockifyUserId) {
      return new Response(
        JSON.stringify({
          error: 'Clockify settings are not configured in the database.',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // 2. Fetch all projects
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, clockify_project_id, target_hours');

    if (projectsError) throw projectsError;

    // 3. Calculate date range for the previous week
    const today = new Date();
    const endOfLastWeek = new Date(
      today.setDate(today.getDate() - today.getDay())
    );
    endOfLastWeek.setHours(23, 59, 59, 999);

    const startOfLastWeek = new Date(endOfLastWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 6);
    startOfLastWeek.setHours(0, 0, 0, 0);

    const start = startOfLastWeek.toISOString();
    const end = endOfLastWeek.toISOString();
    const week_ending_on = endOfLastWeek.toISOString().split('T')[0]; // YYYY-MM-DD format

    // 4. Fetch time entries for all projects for the last week
    const clockifyUrl = `https://api.clockify.me/api/v1/workspaces/${clockifyWorkspaceId}/user/${clockifyUserId}/time-entries?start=${start}&end=${end}&page-size=1000`;
    const clockifyResponse = await fetch(clockifyUrl, {
      headers: { 'X-Api-Key': clockifyApiKey },
    });

    if (!clockifyResponse.ok) {
      throw new Error(`Clockify API error: ${await clockifyResponse.text()}`);
    }

    const timeEntries = await clockifyResponse.json();

    // 5. Process and insert summaries
    const summaries = projects.map((project) => {
      const projectTimeEntries = timeEntries.filter(
        (te) => te.projectId === project.clockify_project_id
      );
      const totalDurationSeconds = projectTimeEntries.reduce(
        (acc, te) => acc + parseISO8601Duration(te.timeInterval.duration),
        0
      );
      const loggedHours = totalDurationSeconds / 3600;

      return {
        project_id: project.id,
        target_hours: project.target_hours,
        logged_hours: loggedHours,
        week_ending_on: week_ending_on,
      };
    });

    const { error: insertError } = await supabase
      .from('weekly_summaries')
      .upsert(summaries, { onConflict: 'project_id,week_ending_on' }); // Use upsert to avoid errors on reruns

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({
        message: `Successfully created ${summaries.length} weekly summaries.`,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
