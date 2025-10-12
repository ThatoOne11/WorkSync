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

  // HARDCODED COLORS (Engaging Light Aesthetic)
  const BRAND_ACCENT = '#79A9D1';
  const PRIMARY_TEXT = '#333333';
  const SECONDARY_TEXT = '#666666';
  const BG_COLOR = '#F8F8F8';
  const SURFACE_COLOR = '#FFFFFF';
  const WARNING_COLOR = '#FFC107';
  const DANGER_COLOR = '#F44336';
  const ALERT_BACKGROUND = '#FFFBE5';
  const CRITICAL_BACKGROUND = '#FBE5E5';

  const { projectName, variance, recommendation } = alert;
  const isOver = variance > 0;
  const statusColor = isOver ? WARNING_COLOR : DANGER_COLOR;
  const statusBackground = isOver ? ALERT_BACKGROUND : CRITICAL_BACKGROUND;
  const statusLabel = isOver ? 'OVER SHOOTING' : 'FALLING BEHIND';
  const headline = isOver ? 'Pace Warning' : 'Time Allocation Alert';
  const subject = `Pacing Alert: ${statusLabel} on ${projectName}`;

  const htmlBody = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>WorkSync Pacing Alert</title>
        <style>
            @media screen and (max-width: 600px) {
                .container {
                    width: 100% !important;
                    min-width: 100% !important;
                }
            }
        </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: ${BG_COLOR}; font-family: 'Roboto', Arial, sans-serif;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: ${BG_COLOR};">
            <tr>
                <td align="center" style="padding: 30px 20px;">
                    <table role="presentation" width="500" class="container" cellspacing="0" cellpadding="0" border="0" style="max-width: 500px; margin-bottom: 20px;">
                        <tr>
                            <td style="padding: 10px 0; color: ${BRAND_ACCENT}; font-size: 20px; font-weight: 700;">
                                WorkSync // CORE
                            </td>
                        </tr>
                    </table>

                    <table role="presentation" width="500" class="container" cellspacing="0" cellpadding="0" border="0" style="max-width: 500px; background-color: ${SURFACE_COLOR}; border-radius: 8px; border: 1px solid ${statusColor}; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
                        <tr>
                            <td style="padding: 0;">
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: ${statusBackground}; border-radius: 8px 8px 0 0; border-bottom: 2px solid ${statusColor};">
                                    <tr>
                                        <td style="padding: 15px 30px; color: ${PRIMARY_TEXT}; font-size: 18px; font-weight: 600;">
                                            ${headline}
                                        </td>
                                    </tr>
                                </table>

                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                    <tr>
                                        <td style="padding: 30px;">
                                            <h3 style="color: ${PRIMARY_TEXT}; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 5px;">
                                                Project: ${projectName}
                                            </h3>

                                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: ${BG_COLOR}; border-radius: 8px; padding: 20px;">
                                                <tr>
                                                    <td style="padding: 0;">
                                                        <p style="font-size: 16px; margin: 0 0 15px 0; color: ${PRIMARY_TEXT}; font-weight: 500;">
                                                            <span style="color: ${statusColor}; font-weight: 700; text-transform: uppercase;">${statusLabel}:</span> Projected to go ${
    isOver ? 'OVER' : 'UNDER'
  } by 
                                                            <span style="color: ${statusColor}; font-weight: 800; font-size: 1.1em;">${Math.abs(
    variance
  ).toFixed(1)} hrs</span>
                                                        </p>
                                                        <p style="font-size: 14px; margin: 0; color: ${PRIMARY_TEXT}; font-weight: 400;">
                                                            ${recommendation}
                                                        </p>
                                                    </td>
                                                </tr>
                                            </table>
                                            
                                            <p style="text-align: center; margin-top: 30px;">
                                                <a href="#" style="background-color: ${BRAND_ACCENT}; color: ${SURFACE_COLOR}; text-decoration: none; padding: 12px 25px; border-radius: 4px; font-weight: 600; font-size: 14px; display: inline-block;">
                                                    Review on WorkSync
                                                </a>
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
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
