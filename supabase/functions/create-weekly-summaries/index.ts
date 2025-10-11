import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Helper function to parse Clockify's duration format
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

// --- EMAIL SENDING LOGIC ---
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

  // Create the HTML for the email body
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
          <th style="text-align: center;">Allocated Hours</th>
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
      from: 'WorkSync <onboarding@resend.dev>', // Resend requires this default for free tier
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
  try {
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

    // 2. Fetch all projects, including their names for the email
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name, clockify_project_id, target_hours');

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
    const week_ending_on = endOfLastWeek.toISOString().split('T')[0];

    // 4. Fetch time entries for the last week
    const clockifyUrl = `https://api.clockify.me/api/v1/workspaces/${clockifyWorkspaceId}/user/${clockifyUserId}/time-entries?start=${start}&end=${end}&page-size=1000`;
    const clockifyResponse = await fetch(clockifyUrl, {
      headers: { 'X-Api-Key': clockifyApiKey },
    });

    if (!clockifyResponse.ok) {
      throw new Error(`Clockify API error: ${await clockifyResponse.text()}`);
    }

    const timeEntries = await clockifyResponse.json();

    // 5. Process summaries
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
        project_name: project.name, // Pass name for email
        target_hours: project.target_hours,
        logged_hours: loggedHours,
        balance: project.target_hours - loggedHours,
        week_ending_on: week_ending_on,
      };
    });

    const summariesToInsert = summaries.map(
      ({ project_name, balance, ...rest }) => rest
    );

    const { error: insertError } = await supabase
      .from('weekly_summaries')
      .upsert(summariesToInsert, { onConflict: 'project_id,week_ending_on' });

    if (insertError) throw insertError;

    // 6. Send the summary email
    const emailResult = await sendSummaryEmail(
      summaries,
      settings,
      endOfLastWeek
    );

    return new Response(
      JSON.stringify({
        message: `Successfully created ${summaries.length} summaries. ${emailResult}`,
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
