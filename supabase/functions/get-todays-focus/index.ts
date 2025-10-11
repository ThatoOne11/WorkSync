import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin, getUserClient } from '../_shared/supabase-client.ts';
import { createJsonResponse, createErrorResponse } from '../_shared/utils.ts';

function getRemainingWorkdays(today: Date) {
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
    const userClient = getUserClient(req);
    const { data: projects, error: projectsError } = await userClient
      .from('projects')
      .select('name, target_hours, clockify_project_id')
      .eq('is_archived', false);

    if (projectsError) throw projectsError;

    const today = new Date();
    const startOfMonth = new Date(
      today.getFullYear(),
      today.getMonth(),
      1
    ).toISOString();

    const { data: settingsData, error: settingsError } = await supabaseAdmin
      .from('settings')
      .select('key, value');
    if (settingsError) throw settingsError;

    const settings = settingsData.reduce(
      (acc, { key, value }) => ({ ...acc, [key]: value }),
      {}
    );

    const { clockifyApiKey, clockifyWorkspaceId, clockifyUserId } = settings;
    if (!clockifyApiKey || !clockifyWorkspaceId || !clockifyUserId)
      throw new Error('Clockify settings missing.');

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

    return createJsonResponse({ focusList });
  } catch (error) {
    return createErrorResponse(error.message);
  }
});
