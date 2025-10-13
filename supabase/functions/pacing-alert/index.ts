import { createClient } from '@supabase/supabase-js';
import { serve } from '@deno/server';
import { corsHeaders } from '../_shared/cors.ts';

// --- TYPE DEFINITIONS ---
interface ProjectAnalysis {
  id: number;
  name: string;
  variance: number;
}

interface User {
  user_id: string;
  enablePacingAlerts?: string;
  notificationEmail?: string;
  clockifyApiKey?: string;
  clockifyWorkspaceId?: string;
  clockifyUserId?: string;
  [key: string]: string | undefined;
}

interface ClockifyTimeEntry {
  projectId: string;
  timeInterval: {
    duration: string;
  };
}

// --- HELPER FUNCTIONS ---
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

// --- NEW EMAIL GENERATION FUNCTION ---
async function sendPacingDigestEmail(
  projectsToAlert: ProjectAnalysis[],
  settings: User
) {
  const { notificationEmail } = settings;
  const resendApiKey = Deno.env.get('RESEND_API_KEY');

  if (!notificationEmail || !resendApiKey) {
    return 'Email notifications are not configured. Skipping email.';
  }

  const BRAND_ACCENT = '#79A9D1';
  const PRIMARY_TEXT = '#333333';
  const SECONDARY_TEXT = '#666666';
  const BG_COLOR = '#F8F8F8';
  const SURFACE_COLOR = '#FFFFFF';
  const DANGER_COLOR = '#F44336';
  const WARNING_COLOR = '#FFC107';
  const DIVIDER_COLOR = '#E0E0E0';

  const projectRows = projectsToAlert
    .map((p) => {
      const isOver = p.variance > 0;
      const statusColor = isOver ? WARNING_COLOR : DANGER_COLOR;
      const statusLabel = isOver ? 'Overshooting' : 'Falling Behind';

      return `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid ${DIVIDER_COLOR};">
          <strong style="color: ${PRIMARY_TEXT};">${p.name}</strong><br>
          <span style="color: ${statusColor}; font-size: 12px; font-weight: 700;">${statusLabel}</span>
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid ${DIVIDER_COLOR}; text-align: right;">
          <strong style="color: ${statusColor}; font-size: 16px;">
            ${(p.variance > 0 ? '+' : '') + p.variance.toFixed(1)} hrs
          </strong>
        </td>
      </tr>
    `;
    })
    .join('');

  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <body style="margin: 0; padding: 0; background-color: ${BG_COLOR}; font-family: sans-serif;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: ${BG_COLOR}; padding: 20px;">
        <tr>
          <td align="center">
            <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: ${SURFACE_COLOR}; border-radius: 8px; padding: 30px;">
              <tr>
                <td>
                  <h1 style="color: ${BRAND_ACCENT}; font-size: 24px;">Your Daily Pacing Digest</h1>
                  <p style="color: ${SECONDARY_TEXT};">Here’s a look at projects that need your attention based on today's progress.</p>
                  
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 20px;">
                    ${projectRows}
                  </table>

                  <p style="color: ${SECONDARY_TEXT}; margin-top: 30px;">Use your <a href="https://worksync-f2s.pages.dev/dashboard" style="color: ${BRAND_ACCENT};">WorkSync Dashboard</a> for a more detailed breakdown and to adjust your focus for tomorrow.</p>
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
      from: 'WorkSync Digest <onboarding@resend.dev>',
      to: notificationEmail,
      subject: `Your Daily Pacing Digest`,
      html: htmlBody,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json();
    throw new Error(`Failed to send email: ${JSON.stringify(errorBody)}`);
  }

  return `Pacing digest successfully sent to ${notificationEmail}.`;
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

    const users = settingsData.reduce(
      (acc: Record<string, User>, { key, value, user_id }) => {
        acc[user_id] = acc[user_id] || { user_id };
        acc[user_id][key] = value;
        return acc;
      },
      {}
    );

    const messages: string[] = [];

    for (const user of Object.values(users)) {
      if (user.enablePacingAlerts !== 'true' || !user.notificationEmail) {
        continue;
      }

      const { clockifyApiKey, clockifyWorkspaceId, clockifyUserId } = user;
      if (!clockifyApiKey || !clockifyWorkspaceId || !clockifyUserId) {
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

      const today = new Date();
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
          .filter(
            (te: ClockifyTimeEntry) => te.projectId === p.clockify_project_id
          )
          .reduce(
            (sum: number, te: ClockifyTimeEntry) =>
              sum + parseISO8601Duration(te.timeInterval.duration),
            0
          );

        const loggedHours = loggedSeconds / 3600;
        const dailyBurnRate = loggedHours / passedWorkdays;
        const projectedHours = dailyBurnRate * totalWorkdays;
        const variance = projectedHours - p.target_hours;

        return { id: p.id, name: p.name, variance };
      });

      const projectsToAlert = projectAnalysis.filter(
        (p) => Math.abs(p.variance) > 2
      );

      if (projectsToAlert.length > 0) {
        const emailResult = await sendPacingDigestEmail(projectsToAlert, user);
        messages.push(emailResult);

        const alertsToUpsert = projectsToAlert.map((p) => ({
          project_id: p.id,
          user_id: user.user_id,
          alert_sent_at: new Date().toISOString(),
        }));
        await supabase
          .from('pacing_alerts')
          .upsert(alertsToUpsert, { onConflict: 'project_id, user_id' });
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Pacing analysis complete.',
        details: messages,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
