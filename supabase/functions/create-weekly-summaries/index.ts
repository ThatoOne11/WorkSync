import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { serve } from '@deno/server';
import { corsHeaders } from '../_shared/cors.ts';

// --- TYPE DEFINITIONS ---
interface TimeEntry {
  projectId: string;
  timeInterval: {
    start: string;
    duration: string;
  };
}

interface User {
  user_id: string;
  enableEmailNotifications?: string;
  notificationEmail?: string;
  clockifyApiKey?: string;
  clockifyWorkspaceId?: string;
  clockifyUserId?: string;
  [key: string]: string | undefined;
}

interface WeeklyStats {
  weeklyLoggedHours: number;
  recommendedWeeklyHours: number;
  weeklyBalance: number;
  overallStatus: 'On Pace' | 'Over Shooting' | 'Under Shooting';
  peakDay: string;
  peakHours: number;
  topProject: string;
  topProjectShare: number;
}

interface ProjectSummary {
  project_id: number;
  project_name: string;
  target_hours: number;
  logged_hours: number;
  balance: number;
  week_ending_on: string;
  user_id: string;
  recommended_hours?: number;
}

interface Project {
  id: number;
  name: string;
  clockify_project_id: string;
  target_hours: number;
}

// --- HELPER FUNCTIONS ---
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
  return workdays > 0 ? workdays : 20; // Default to 20 for safety
}

function getWeekOfMonth(date: Date): number {
  const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const dayOfWeek = firstDayOfMonth.getDay();
  // Adjust the date to the start of the week (Sunday)
  const adjustedDate = date.getDate() + dayOfWeek;
  return Math.ceil(adjustedDate / 7);
}

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

// --- EMAIL GENERATION ---
async function sendSummaryEmail(
  summariesForEmail: ProjectSummary[],
  weeklyStats: WeeklyStats,
  allMonthlyData: ProjectSummary[],
  settings: User,
  weekEndingDate: Date
) {
  const { notificationEmail, enableEmailNotifications } = settings;
  const resendApiKey = Deno.env.get('RESEND_API_KEY');

  if (
    String(enableEmailNotifications) !== 'true' ||
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
  const weekNumber = getWeekOfMonth(weekEndingDate);
  const isLastWeekOfMonth =
    new Date(
      weekEndingDate.getFullYear(),
      weekEndingDate.getMonth() + 1,
      0
    ).getDate() -
      weekEndingDate.getDate() <
    7;

  const BRAND_ACCENT = '#79A9D1';
  const PRIMARY_TEXT = '#333333';
  const SECONDARY_TEXT = '#666666';
  const BG_COLOR = '#F8F8F8';
  const SURFACE_COLOR = '#FFFFFF';
  const DIVIDER_COLOR = '#E0E0E0';
  const SUCCESS_COLOR = '#4CAF50';
  const DANGER_COLOR = '#F44336';
  const INFO_COLOR = '#2196F3';

  const weeklyBalanceAbs = Math.abs(weeklyStats.weeklyBalance).toFixed(2);
  let insightText = '';
  if (weeklyStats.weeklyBalance < 0) {
    insightText = `You logged <span style="color: ${DANGER_COLOR}; font-weight: 700;">${weeklyStats.weeklyLoggedHours.toFixed(
      2
    )} hours</span> this week, which is ${weeklyBalanceAbs} hours more than your recommended target of ${weeklyStats.recommendedWeeklyHours.toFixed(
      2
    )}. Review your pacing to avoid burnout.`;
  } else if (weeklyStats.weeklyBalance > 0) {
    insightText = `You logged <span style="color: ${PRIMARY_TEXT}; font-weight: 700;">${weeklyStats.weeklyLoggedHours.toFixed(
      2
    )} hours</span> this week, compared to your recommended weekly target of ${weeklyStats.recommendedWeeklyHours.toFixed(
      2
    )} hours. You went under by ${weeklyBalanceAbs} hours.`;
  } else {
    insightText = `You logged ${weeklyStats.weeklyLoggedHours.toFixed(
      2
    )} hours this week, hitting your recommended weekly target exactly! Excellent consistency.`;
  }
  insightText += ' Use this week’s daily focus report to bridge the gap.';

  let tableHeaders = '';
  let tableRows = '';

  if (isLastWeekOfMonth) {
    tableHeaders = `
          <th style="padding: 10px 20px; text-align: left; font-weight: 700;">Project</th>
          <th style="padding: 10px 20px; text-align: center; font-weight: 700;">Monthly Allocation (H)</th>
          <th style="padding: 10px 20px; text-align: center; font-weight: 700;">Total Logged (H)</th>
          <th style="padding: 10px 20px; text-align: right; font-weight: 700;">Final Balance</th>
      `;
    tableRows = summariesForEmail
      .map((s) => {
        const totalLogged = allMonthlyData
          .filter((d) => d.project_id === s.project_id)
          .reduce((acc, cur) => acc + cur.logged_hours, 0);
        const finalBalance = s.target_hours - totalLogged;
        return `
              <tr>
                  <td style="padding: 14px 20px; font-weight: 500; border-bottom: 1px solid ${DIVIDER_COLOR};">${
          s.project_name
        }</td>
                  <td style="padding: 14px 20px; text-align: center; border-bottom: 1px solid ${DIVIDER_COLOR};">${s.target_hours.toFixed(
          2
        )}</td>
                  <td style="padding: 14px 20px; text-align: center; font-weight: 600; border-bottom: 1px solid ${DIVIDER_COLOR};">${totalLogged.toFixed(
          2
        )}</td>
                  <td style="padding: 14px 20px; text-align: right; font-weight: 700; color: ${
                    finalBalance >= 0 ? SUCCESS_COLOR : DANGER_COLOR
                  }; border-bottom: 1px solid ${DIVIDER_COLOR};">${
          (finalBalance >= 0 ? '+' : '') + finalBalance.toFixed(2)
        }</td>
              </tr>
          `;
      })
      .join('');
  } else {
    tableHeaders =
      '<th style="padding: 10px 20px; text-align: left; font-weight: 700;">Project</th><th style="padding: 10px 20px; text-align: center; font-weight: 700;">Allocation (H)</th>';
    for (let i = 1; i <= weekNumber; i++) {
      tableHeaders += `<th style="padding: 10px 20px; text-align: center; font-weight: 700;">W${i} Rec (H)</th><th style="padding: 10px 20px; text-align: center; font-weight: 700;">W${i} Logged (H)</th>`;
    }
    tableHeaders +=
      '<th style="padding: 10px 20px; text-align: right; font-weight: 700;">Cumulative Balance</th>';

    const projectData: Record<
      number,
      {
        name: string;
        target: number;
        weeks: Record<number, { rec: number; logged: number }>;
      }
    > = {};
    allMonthlyData.forEach((s) => {
      const wNum = getWeekOfMonth(new Date(s.week_ending_on));
      if (!projectData[s.project_id])
        projectData[s.project_id] = {
          name: s.project_name,
          target: s.target_hours,
          weeks: {},
        };
      projectData[s.project_id].weeks[wNum] = {
        rec: s.recommended_hours || 0,
        logged: s.logged_hours,
      };
    });

    tableRows = Object.values(projectData)
      .map((p) => {
        let rowHtml = `<td style="padding: 14px 20px; font-weight: 500; border-bottom: 1px solid ${DIVIDER_COLOR};">${p.name}</td>`;
        rowHtml += `<td style="padding: 14px 20px; text-align: center; border-bottom: 1px solid ${DIVIDER_COLOR};">${p.target.toFixed(
          2
        )}</td>`;
        let cumulativeLogged = 0,
          cumulativeRec = 0;
        for (let i = 1; i <= weekNumber; i++) {
          const week = p.weeks[i];
          rowHtml += `<td style="padding: 14px 20px; text-align: center; border-bottom: 1px solid ${DIVIDER_COLOR};">${
            week ? week.rec.toFixed(2) : '–'
          }</td>`;
          rowHtml += `<td style="padding: 14px 20px; text-align: center; font-weight: 600; border-bottom: 1px solid ${DIVIDER_COLOR};">${
            week ? week.logged.toFixed(2) : '–'
          }</td>`;
          cumulativeLogged += week?.logged || 0;
          cumulativeRec += week?.rec || 0;
        }
        const cumulativeBalance = cumulativeRec - cumulativeLogged;
        rowHtml += `<td style="padding: 14px 20px; text-align: right; font-weight: 700; color: ${
          cumulativeBalance >= 0 ? SUCCESS_COLOR : DANGER_COLOR
        }; border-bottom: 1px solid ${DIVIDER_COLOR};">${
          (cumulativeBalance >= 0 ? '+' : '') + cumulativeBalance.toFixed(2)
        }</td>`;
        return `<tr>${rowHtml}</tr>`;
      })
      .join('');
  }

  const htmlBody = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>WorkSync Weekly Summary</title>
      <style>
          @media screen and (max-width: 600px) {
              .container {
                  width: 100% !important;
                  min-width: 100% !important;
              }
              .stat-column {
                  display: block !important;
                  width: 100% !important;
                  padding-bottom: 15px !important;
                  padding-left: 0 !important;
                  padding-right: 0 !important;
              }
          }
      </style>
  </head>
  <body style="margin: 0; padding: 0; background-color: ${BG_COLOR}; font-family: 'Roboto', Arial, sans-serif;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: ${BG_COLOR};">
          <tr>
              <td align="center" style="padding: 30px 20px;">
                  <table role="presentation" width="600" class="container" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; margin-bottom: 20px;">
                      <tr>
                          <td style="padding: 15px 0; color: ${BRAND_ACCENT}; font-size: 24px; font-weight: 700; letter-spacing: 1px;">
                              WorkSync // CORE
                          </td>
                      </tr>
                  </table>
  
                  <table role="presentation" width="600" class="container" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: ${SURFACE_COLOR}; border-radius: 8px; border: 1px solid ${DIVIDER_COLOR}; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                      <tr>
                          <td style="padding: 30px;">
                              <h1 style="color: ${BRAND_ACCENT}; font-size: 28px; font-weight: 700; margin-top: 0; margin-bottom: 10px;">
                                  Your Weekly Pacing Report is Ready!
                              </h1>
                              
                              <p style="color: ${SECONDARY_TEXT}; font-size: 16px; margin-bottom: 5px;">
                                  ${insightText}
                              </p>
                              
                              <p style="color: ${PRIMARY_TEXT}; font-size: 18px; font-weight: 700; margin-top: 15px; margin-bottom: 25px; border-top: 1px dashed ${DIVIDER_COLOR}; padding-top: 15px;">
                                  Overall Monthly Status: <span style="color: ${
                                    weeklyStats.overallStatus ===
                                    'Over Shooting'
                                      ? DANGER_COLOR
                                      : weeklyStats.overallStatus ===
                                        'Under Shooting'
                                      ? INFO_COLOR
                                      : SUCCESS_COLOR
                                  };">${weeklyStats.overallStatus}</span>
                              </p>
                              
                              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 30px;">
                                  <tr>
                                      <td class="stat-column" width="50%" valign="top" style="padding-right: 15px;">
                                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border: 1px solid ${DIVIDER_COLOR}; border-radius: 6px; padding: 15px;">
                                              <tr>
                                                  <td style="color: ${SECONDARY_TEXT}; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; padding-bottom: 5px;">
                                                      Peak Productivity Day
                                                  </td>
                                              </tr>
                                              <tr>
                                                  <td style="color: ${PRIMARY_TEXT}; font-size: 24px; font-weight: 700;">
                                                      ${weeklyStats.peakDay}
                                                  </td>
                                              </tr>
                                              <tr>
                                                  <td style="color: ${BRAND_ACCENT}; font-size: 14px; font-weight: 600;">
                                                      ${weeklyStats.peakHours.toFixed(
                                                        2
                                                      )} hrs logged
                                                  </td>
                                              </tr>
                                          </table>
                                      </td>
                                      <td class="stat-column" width="50%" valign="top" style="padding-left: 15px;">
                                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border: 1px solid ${DIVIDER_COLOR}; border-radius: 6px; padding: 15px;">
                                              <tr>
                                                  <td style="color: ${SECONDARY_TEXT}; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; padding-bottom: 5px;">
                                                      Top Project
                                                  </td>
                                              </tr>
                                              <tr>
                                                  <td style="color: ${PRIMARY_TEXT}; font-size: 16px; font-weight: 700; line-height: 1.2;">
                                                      ${weeklyStats.topProject}
                                                  </td>
                                              </tr>
                                              <tr>
                                                  <td style="color: ${INFO_COLOR}; font-size: 14px; font-weight: 600;">
                                                      ${weeklyStats.topProjectShare.toFixed(
                                                        0
                                                      )}% of total time
                                                  </td>
                                              </tr>
                                          </table>
                                      </td>
                                  </tr>
                              </table>
  
                              <h3 style="color: ${PRIMARY_TEXT}; font-size: 18px; font-weight: 600; margin-bottom: 15px;">
                                  Project Breakdown
                              </h3>
  
                                 <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse;">
                                     <thead style="background-color: ${BG_COLOR}; color: ${SECONDARY_TEXT}; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">
                                         <tr>
                                             ${tableHeaders}
                                         </tr>
                                     </thead>
                                     <tbody>
                                         ${tableRows}
                                     </tbody>
                                 </table>
                              
                              <p style="text-align: center; margin-top: 40px; color: ${SECONDARY_TEXT}; font-size: 12px; padding-top: 10px; border-top: 1px dashed ${DIVIDER_COLOR};">
                                  <a href="https://worksync-f2s.pages.dev/dashboard" style="color: ${INFO_COLOR}; text-decoration: none; font-weight: 700;">Visit the Dashboard</a> to adjust targets or start your monthly rollover.
                              </p>
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
      from: 'WorkSync <onboarding@resend.dev>',
      to: notificationEmail,
      subject: `Weekly Pacing Report: Week Of ${formattedDate}`,
      html: htmlBody,
    }),
  });

  if (!response.ok)
    throw new Error(
      `Failed to send email: ${JSON.stringify(await response.json())}`
    );
  return `Email successfully sent to ${notificationEmail}.`;
}

// --- MAIN FUNCTION ---
serve(async (_req) => {
  if (_req.method === 'OPTIONS')
    return new Response('ok', { headers: corsHeaders });

  try {
    const supabase: SupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const { data: settingsData, error: settingsError } = await supabase
      .from('settings')
      .select('key, value, user_id');
    if (settingsError) throw settingsError;

    const users: Record<string, User> = settingsData.reduce(
      (acc, { key, value, user_id }) => {
        (acc[user_id] = acc[user_id] || { user_id })[key] = value;
        return acc;
      },
      {} as Record<string, User>
    );

    const globalMessages: string[] = [];

    for (const user of Object.values(users)) {
      try {
        if (
          user.enableEmailNotifications !== 'true' ||
          !user.notificationEmail
        ) {
          globalMessages.push(
            `Skipping user ${user.user_id}: Email notifications disabled.`
          );
          continue;
        }

        const { clockifyApiKey, clockifyWorkspaceId, clockifyUserId } = user;
        if (!clockifyApiKey || !clockifyWorkspaceId || !clockifyUserId) {
          globalMessages.push(
            `Skipping user ${user.user_id}: Clockify credentials missing.`
          );
          continue;
        }

        const { data: projects, error: projectsError } = await supabase
          .from('projects')
          .select('id, name, clockify_project_id, target_hours')
          .eq('is_archived', false)
          .eq('user_id', user.user_id);
        if (projectsError) throw projectsError;
        if (!projects || projects.length === 0) {
          globalMessages.push(
            `Skipping user ${user.user_id}: No active projects found.`
          );
          continue;
        }

        const today = new Date();
        const endOfLastWeek = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() - today.getDay()
        );
        endOfLastWeek.setHours(23, 59, 59, 999);

        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const workdaysInMonth = getWorkdaysInMonth(
          today.getFullYear(),
          today.getMonth()
        );
        const currentWeekNumber = getWeekOfMonth(endOfLastWeek);

        const allMonthlyData: ProjectSummary[] = [];
        const summariesToUpsert = [];

        for (let i = 1; i <= currentWeekNumber; i++) {
          const weekEndDate = new Date(startOfMonth);
          weekEndDate.setDate(
            weekEndDate.getDate() +
              (i - 1) * 7 +
              (6 - (startOfMonth.getDay() === 0 ? 7 : startOfMonth.getDay())) +
              1
          );

          const weekStartDate = new Date(weekEndDate);
          weekStartDate.setDate(weekEndDate.getDate() - 6);

          const clockifyUrl = `https://api.clockify.me/api/v1/workspaces/${clockifyWorkspaceId}/user/${clockifyUserId}/time-entries?start=${weekStartDate.toISOString()}&end=${weekEndDate.toISOString()}&page-size=1000`;
          const response = await fetch(clockifyUrl, {
            headers: { 'X-Api-Key': clockifyApiKey },
          });
          if (!response.ok)
            throw new Error(
              `Clockify API error during week ${i} fetch for user ${
                user.user_id
              }: ${await response.text()}`
            );

          const timeEntries: TimeEntry[] = await response.json();

          const weeklySummaries = projects.map((project) => {
            const logged_hours =
              timeEntries
                .filter((te) => te.projectId === project.clockify_project_id)
                .reduce(
                  (acc, te) =>
                    acc + parseISO8601Duration(te.timeInterval.duration),
                  0
                ) / 3600;

            return {
              project_id: project.id,
              project_name: project.name,
              user_id: user.user_id,
              target_hours: project.target_hours,
              logged_hours,
              week_ending_on: weekEndDate.toISOString().split('T')[0],
              recommended_hours: (project.target_hours / workdaysInMonth) * 5,
              balance:
                (project.target_hours / workdaysInMonth) * 5 - logged_hours,
            };
          });

          allMonthlyData.push(...weeklySummaries);
          summariesToUpsert.push(
            ...weeklySummaries.map(
              ({
                project_name: _p,
                balance: _b,
                recommended_hours: _r,
                ...rest
              }) => rest
            )
          );
        }

        const { weeklyStats, summaries: summariesForEmail } = processWeeklyData(
          allMonthlyData,
          projects,
          endOfLastWeek
        );

        await supabase.from('weekly_summaries').upsert(summariesToUpsert, {
          onConflict: 'project_id,week_ending_on,user_id',
        });

        const emailResult = await sendSummaryEmail(
          summariesForEmail,
          weeklyStats,
          allMonthlyData,
          user,
          endOfLastWeek
        );
        globalMessages.push(emailResult);
      } catch (error) {
        const errorMessage = `Failed to process user ${user.user_id}: ${
          (error as Error).message
        }`;
        console.error(errorMessage);
        globalMessages.push(errorMessage);
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Weekly summary scheduler completed.',
        details: globalMessages,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Critical error in function:', (error as Error).message);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function processWeeklyData(
  allMonthlyData: ProjectSummary[],
  projects: Project[],
  endOfLastWeek: Date
) {
  const thisWeekData = allMonthlyData.filter(
    (d) => d.week_ending_on === endOfLastWeek.toISOString().split('T')[0]
  );

  const weeklyLoggedHours = thisWeekData.reduce(
    (acc, s) => acc + s.logged_hours,
    0
  );
  const recommendedWeeklyHours = thisWeekData.reduce(
    (acc, s) => acc + (s.recommended_hours || 0),
    0
  );

  // Peak day and top project require re-processing time entries or passing them down.
  // This is a simplified approach for demonstration. A more accurate implementation
  // would require passing the raw time entries to this function.
  const projectTotalsWeek: Record<string, { name: string; logged: number }> =
    {};
  thisWeekData.forEach((s) => {
    projectTotalsWeek[s.project_id] = {
      name: s.project_name,
      logged: s.logged_hours,
    };
  });
  const topProject =
    Object.values(projectTotalsWeek).sort((a, b) => b.logged - a.logged)[0]
      ?.name || 'N/A';

  const totalLoggedMonth = allMonthlyData.reduce(
    (acc, s) => acc + s.logged_hours,
    0
  );
  const totalTarget = projects.reduce((acc, p) => acc + p.target_hours, 0);
  const overallBalance = totalTarget - totalLoggedMonth;
  let overallStatus: 'On Pace' | 'Over Shooting' | 'Under Shooting' = 'On Pace';
  if (totalTarget > 0) {
    if (overallBalance < -0.05 * totalTarget) overallStatus = 'Over Shooting';
    else if (overallBalance > 0.05 * totalTarget)
      overallStatus = 'Under Shooting';
  }

  const weeklyStats: WeeklyStats = {
    weeklyLoggedHours,
    recommendedWeeklyHours,
    weeklyBalance: recommendedWeeklyHours - weeklyLoggedHours,
    overallStatus,
    peakDay: 'N/A', // Placeholder - requires more detailed data
    peakHours: 0, // Placeholder
    topProject,
    topProjectShare:
      weeklyLoggedHours > 0 &&
      projectTotalsWeek[
        Object.keys(projectTotalsWeek).find(
          (k) => projectTotalsWeek[k].name === topProject
        )!
      ]
        ? (projectTotalsWeek[
            Object.keys(projectTotalsWeek).find(
              (k) => projectTotalsWeek[k].name === topProject
            )!
          ].logged /
            weeklyLoggedHours) *
          100
        : 0,
  };

  return { weeklyStats, summaries: thisWeekData };
}
