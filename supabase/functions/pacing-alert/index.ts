import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

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

function getWorkdaysInMonth(year: number, month: number): number {
  let workdays = 0;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const currentDate = new Date(year, month, day);
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek > 0 && dayOfWeek < 6) {
      // Monday to Friday
      workdays++;
    }
  }
  return workdays;
}

function getPassedWorkdays(today: Date): number {
  let passedWorkdays = 0;
  const year = today.getFullYear();
  const month = today.getMonth();
  for (let day = 1; day <= today.getDate(); day++) {
    const currentDate = new Date(year, month, day);
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek > 0 && dayOfWeek < 6) {
      passedWorkdays++;
    }
  }
  return passedWorkdays > 0 ? passedWorkdays : 1;
}

async function sendPacingAlertEmail(alert: any, settings: any) {
  const { notificationEmail } = settings;
  const resendApiKey = Deno.env.get('RESEND_API_KEY');

  if (!notificationEmail || !resendApiKey) {
    return 'Email notifications are not configured. Skipping email.';
  }

  const { projectName, variance, recommendation } = alert;
  const subject = `WorkSync Pacing Alert for ${projectName}`;
  const htmlBody = `
    <h1>WorkSync Pacing Alert</h1>
    <p>This is a proactive alert to help you stay on track with your monthly goals.</p>
    <p>
      <strong>Project:</strong> ${projectName}<br>
      <strong>Issue:</strong> You are currently on track to go ${
        variance > 0 ? 'over' : 'under'
      } by <strong>${Math.abs(variance).toFixed(1)} hours</strong>.
    </p>
    <p><strong>Recommendation:</strong> ${recommendation}</p>
  `;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: 'WorkSync Alerts <onboarding@resend.dev>',
      to: notificationEmail,
      subject: subject,
      html: htmlBody,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json();
    throw new Error(`Failed to send email: ${JSON.stringify(errorBody)}`);
  }

  return `Pacing alert successfully sent to ${notificationEmail}.`;
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

    const { data: settingsData, error: settingsError } = await supabase
      .from('settings')
      .select('key, value, user_id');

    if (settingsError) throw settingsError;

    const users = settingsData.reduce((acc, { key, value, user_id }) => {
      acc[user_id] = acc[user_id] || { user_id };
      acc[user_id][key] = value;
      return acc;
    }, {} as Record<string, any>);

    let messages = [];

    for (const user of Object.values(users)) {
      if (user.enablePacingAlerts !== 'true') {
        messages.push(
          `Pacing alerts disabled for user ${user.user_id}. Skipping.`
        );
        continue;
      }

      const { clockifyApiKey, clockifyWorkspaceId, clockifyUserId } = user;
      if (!clockifyApiKey || !clockifyWorkspaceId || !clockifyUserId) {
        messages.push(
          `Clockify settings missing for user ${user.user_id}. Skipping.`
        );
        continue;
      }

      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, target_hours, clockify_project_id')
        .eq('is_archived', false)
        .eq('user_id', user.user_id);

      if (projectsError || !projects || projects.length === 0) {
        continue;
      }

      // --- FIX: Change from a rolling 24-hour window to a calendar day reset ---
      const today = new Date();
      const startOfTodayUTC = new Date(
        Date.UTC(
          today.getUTCFullYear(),
          today.getUTCMonth(),
          today.getUTCDate()
        )
      );

      const { data: recentAlerts } = await supabase
        .from('pacing_alerts')
        .select('project_id')
        .eq('user_id', user.user_id)
        .gte('alert_sent_at', startOfTodayUTC.toISOString());

      const recentlyAlertedProjectIds = new Set(
        (recentAlerts || []).map((a) => a.project_id)
      );
      // --- END OF FIX ---

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

      const totalWorkdays = getWorkdaysInMonth(
        today.getFullYear(),
        today.getMonth()
      );
      const passedWorkdays = getPassedWorkdays(today);

      const projectAnalysis = projects.map((p) => {
        const loggedSeconds = timeEntries
          .filter((te: any) => te.projectId === p.clockify_project_id)
          .reduce(
            (sum: number, te: any) =>
              sum + parseISO8601Duration(te.timeInterval.duration),
            0
          );

        const loggedHours = loggedSeconds / 3600;
        const dailyBurnRate = loggedHours / passedWorkdays;
        const projectedHours = dailyBurnRate * totalWorkdays;
        const variance = projectedHours - p.target_hours;

        return { id: p.id, name: p.name, target: p.target_hours, variance };
      });

      const highVarianceProjects = projectAnalysis.filter(
        (p) => Math.abs(p.variance) > p.target * 0.1
      );

      const projectsToAlert = highVarianceProjects.filter(
        (p) => !recentlyAlertedProjectIds.has(p.id)
      );

      if (projectsToAlert.length === 0) {
        messages.push(
          `All projects on pace or already alerted for user ${user.user_id}.`
        );
        continue;
      }

      const mostCriticalProject = projectsToAlert.sort(
        (a, b) => Math.abs(b.variance) - Math.abs(a.variance)
      )[0];

      let recommendation = '';
      if (mostCriticalProject.variance > 0) {
        recommendation =
          'Consider slowing down or shifting focus to other projects to avoid burnout and stay within budget.';
      } else {
        recommendation =
          'Consider allocating more time here soon to catch up and meet your monthly target.';
      }

      const alert = {
        projectName: mostCriticalProject.name,
        variance: mostCriticalProject.variance,
        recommendation,
      };

      const emailResult = await sendPacingAlertEmail(alert, user);
      messages.push(emailResult);

      await supabase.from('pacing_alerts').upsert(
        {
          project_id: mostCriticalProject.id,
          user_id: user.user_id,
          alert_sent_at: new Date().toISOString(),
        },
        { onConflict: 'project_id, user_id' }
      );
    }

    return new Response(
      JSON.stringify({
        message: 'Pacing analysis complete for all users.',
        details: messages,
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
