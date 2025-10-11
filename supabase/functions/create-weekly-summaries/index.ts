import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabase-client.ts';
import { createJsonResponse, createErrorResponse } from '../_shared/utils.ts';

function parseISO8601Duration(duration: string): number {
  if (!duration) return 0;
  const regex = /P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/;
  const matches = duration.match(regex);
  if (!matches) return 0;

  const days = parseFloat(matches[1] || '0');
  const hours = parseFloat(matches[2] || '0');
  const minutes = parseFloat(matches[3] || '0');
  const seconds = parseFloat(matches[4] || '0');

  return days * 24 * 3600 + hours * 3600 + minutes * 60 + seconds;
}

async function sendSummaryEmail(
  summaries: any[],
  settings: Record<string, string>,
  weekEndingDate: Date
) {
  const { notificationEmail, enableEmailNotifications } = settings;
  const resendApiKey = Deno.env.get('RESEND_API_KEY');

  if (
    enableEmailNotifications !== 'true' ||
    !notificationEmail ||
    !resendApiKey
  ) {
    return 'Email notifications are disabled or not configured. Skipping email.';
  }

  const formattedDate = weekEndingDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const tableRows = summaries
    .map(
      (s) => `
    <tr>
      <td>${s.project_name}</td>
      <td style="text-align: center;">${s.target_hours.toFixed(2)}</td>
      <td style="text-align: center;">${s.logged_hours.toFixed(2)}</td>
      <td style="text-align: center; color: ${
        s.balance >= 0 ? 'green' : 'red'
      };">${s.balance.toFixed(2)}</td>
    </tr>
  `
    )
    .join('');

  const htmlBody = `
    <h1>WorkSync Weekly Summary</h1>
    <p>Here is your project summary for the week ending on ${formattedDate}.</p>
    <table border="1" cellpadding="10" cellspacing="0" style="border-collapse: collapse; width: 100%;">
      <thead>
        <tr>
          <th>Project</th>
          <th style="text-align: center;">Target Hours</th>
          <th style="text-align: center;">Logged Hours</th>
          <th style="text-align: center;">Balance</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
  `;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: 'WorkSync <onboarding@resend.dev>',
      to: notificationEmail,
      subject: `WorkSync Weekly Summary: ${formattedDate}`,
      html: htmlBody,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json();
    throw new Error(`Failed to send email: ${JSON.stringify(errorBody)}`);
  }

  return `Email successfully sent to ${notificationEmail}.`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { data: settingsData, error: settingsError } = await supabaseAdmin
      .from('settings')
      .select('key, value');

    if (settingsError) throw settingsError;

    const settings = settingsData.reduce((acc, { key, value }) => {
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);

    const { clockifyApiKey, clockifyWorkspaceId, clockifyUserId } = settings;

    if (!clockifyApiKey || !clockifyWorkspaceId || !clockifyUserId) {
      return createErrorResponse('Clockify settings are not configured.', 400);
    }

    const { data: projects, error: projectsError } = await supabaseAdmin
      .from('projects')
      .select('id, name, clockify_project_id, target_hours');

    if (projectsError) throw projectsError;

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
    const week_ending_on = endOfLastWeek.toISOString().split('T')[0];

    const clockifyUrl = `https://api.clockify.me/api/v1/workspaces/${clockifyWorkspaceId}/user/${clockifyUserId}/time-entries?start=${start}&end=${end}&page-size=1000`;
    const clockifyResponse = await fetch(clockifyUrl, {
      headers: { 'X-Api-Key': clockifyApiKey },
    });

    if (!clockifyResponse.ok) {
      throw new Error(`Clockify API error: ${await clockifyResponse.text()}`);
    }

    const timeEntries = await clockifyResponse.json();

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
        project_name: project.name,
        target_hours: project.target_hours,
        logged_hours: loggedHours,
        balance: project.target_hours - loggedHours,
        week_ending_on: week_ending_on,
      };
    });

    const summariesToInsert = summaries.map(
      ({ project_name, balance, ...rest }) => rest
    );

    const { error: insertError } = await supabaseAdmin
      .from('weekly_summaries')
      .upsert(summariesToInsert, { onConflict: 'project_id,week_ending_on' });

    if (insertError) throw insertError;

    const emailResult = await sendSummaryEmail(
      summaries,
      settings,
      endOfLastWeek
    );

    return createJsonResponse({
      message: `Successfully created ${summaries.length} summaries. ${emailResult}`,
    });
  } catch (error) {
    return createErrorResponse(error.message);
  }
});
