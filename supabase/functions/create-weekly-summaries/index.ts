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

interface WeeklyStats {
  weeklyLoggedHours: number;
  totalTargetHours: number;
  overallBalance: number;
  overallStatus: 'On Pace' | 'Over Shooting' | 'Under Shooting';
  peakDay: string;
  peakHours: number;
  topProject: string;
  topProjectShare: number;
}

async function sendSummaryEmail(
  summaries: any[],
  weeklyStats: WeeklyStats,
  settings: Record<string, string>,
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

  // HARDCODED COLORS (Engaging Light Aesthetic)
  const BRAND_ACCENT = '#79A9D1';
  const PRIMARY_TEXT = '#333333';
  const SECONDARY_TEXT = '#666666';
  const BG_COLOR = '#F8F8F8';
  const SURFACE_COLOR = '#FFFFFF';
  const DIVIDER_COLOR = '#E0E0E0';
  const SUCCESS_COLOR = '#4CAF50';
  const DANGER_COLOR = '#F44336';
  const INFO_COLOR = '#2196F3'; // Blue for info

  const tableRows = summaries
    .map(
      (s) => `
    <tr>
      <td style="padding: 14px 0 14px 20px; font-weight: 500; color: ${PRIMARY_TEXT}; font-size: 14px; border-bottom: 1px solid ${DIVIDER_COLOR};">${
        s.project_name
      }</td>
      <td style="padding: 14px 20px; text-align: center; color: ${SECONDARY_TEXT}; font-size: 14px; border-bottom: 1px solid ${DIVIDER_COLOR};">${s.target_hours.toFixed(
        2
      )}</td>
      <td style="padding: 14px 20px; text-align: center; color: ${PRIMARY_TEXT}; font-weight: 600; font-size: 14px; border-bottom: 1px solid ${DIVIDER_COLOR};">${s.logged_hours.toFixed(
        2
      )}</td>
      <td style="padding: 14px 20px 14px 0; text-align: right; font-weight: 700; font-size: 14px; color: ${
        s.balance >= 0 ? SUCCESS_COLOR : DANGER_COLOR
      }; border-bottom: 1px solid ${DIVIDER_COLOR};">${
        (s.balance >= 0 ? '+' : '') + s.balance.toFixed(2)
      }</td>
    </tr>
  `
    )
    .join('');

  //Overall Insight Content Generation
  let overallBalanceValue = Math.abs(weeklyStats.overallBalance).toFixed(2);
  let insightText = '';

  if (weeklyStats.overallStatus === 'Over Shooting') {
    insightText = `You logged <span style="color: ${DANGER_COLOR}; font-weight: 700;">${weeklyStats.weeklyLoggedHours.toFixed(
      2
    )} hours</span> this week, logging ${overallBalanceValue} hours more than your total targets so far! Review your pacing to avoid burnout or unnecessary overtime.`;
  } else if (weeklyStats.overallStatus === 'Under Shooting') {
    insightText = `You logged <span style="color: ${PRIMARY_TEXT}; font-weight: 700;">${weeklyStats.weeklyLoggedHours.toFixed(
      2
    )} hours</span> this week, leaving <span style="color: ${INFO_COLOR}; font-weight: 700;">${overallBalanceValue} hours</span> of your total monthly target remaining. Use your Daily Focus report to ensure you bridge this gap over the next weeks.`;
  } else {
    // On Pace
    insightText = `You logged ${weeklyStats.weeklyLoggedHours.toFixed(
      2
    )} hours this week, staying perfectly aligned with your monthly targets! Excellent consistency and balance this period.`;
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
                                      weeklyStats.overallBalance >= 0
                                        ? INFO_COLOR
                                        : DANGER_COLOR
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
                                                        ${
                                                          weeklyStats.topProject
                                                        }
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
                                    <thead>
                                        <tr style="background-color: ${BG_COLOR}; color: ${SECONDARY_TEXT}; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">
                                            <th style="padding: 10px 20px; text-align: left; font-weight: 700; border-radius: 4px 0 0 0;">Project</th>
                                            <th style="padding: 10px 20px; text-align: center; font-weight: 700;">Monthly Allocation (H)</th>
                                            <th style="padding: 10px 20px; text-align: center; font-weight: 700;">Logged This Week (H)</th>
                                            <th style="padding: 10px 20px 10px 0; text-align: right; font-weight: 700; border-radius: 0 4px 0 0;">Balance</th>
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
    // 1. Initialize Supabase Client with SERVICE_ROLE_KEY for admin access
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 2. Fetch all settings data to process all users who have notifications enabled.
    const { data: settingsData, error: settingsError } = await supabase
      .from('settings')
      .select('key, value, user_id');

    if (settingsError) throw settingsError;

    // Convert flat settings data into a user object map
    const users = settingsData.reduce((acc, { key, value, user_id }) => {
      acc[user_id] = acc[user_id] || { user_id };
      acc[user_id][key] = value;
      return acc;
    }, {} as Record<string, any>);

    let globalMessages: string[] = [];

    // 3. Iterate through each user
    for (const user of Object.values(users)) {
      // Skip users who do not have email notifications enabled
      if (user.enableEmailNotifications !== 'true' || !user.notificationEmail) {
        globalMessages.push(
          `Skipping user ${user.user_id}: Email notifications disabled.`
        );
        continue;
      }

      const { clockifyApiKey, clockifyWorkspaceId, clockifyUserId } = user;
      const browserId = user.user_id; // Use the stored user_id as the browserId for DB operations

      if (!clockifyApiKey || !clockifyWorkspaceId || !clockifyUserId) {
        globalMessages.push(
          `Skipping user ${user.user_id}: Clockify credentials missing.`
        );
        continue;
      }

      // 4. Get user's projects
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, clockify_project_id, target_hours')
        .eq('is_archived', false)
        .eq('user_id', browserId); // Filter by user_id

      if (projectsError || !projects || projects.length === 0) {
        globalMessages.push(
          `Skipping user ${user.user_id}: No active projects found.`
        );
        continue;
      }

      // --- Date setup ---
      const today = new Date();
      // 1. Define last week's boundaries
      const endOfLastWeek = new Date(
        today.setDate(today.getDate() - today.getDay())
      );
      endOfLastWeek.setHours(23, 59, 59, 999);

      const startOfLastWeek = new Date(endOfLastWeek);
      startOfLastWeek.setDate(startOfLastWeek.getDate() - 6);
      startOfLastWeek.setHours(0, 0, 0, 0);

      // 2. Define month-to-date boundaries (MTD)
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      startOfMonth.setHours(0, 0, 0, 0);

      // --- API Calls ---
      const weekStart = startOfLastWeek.toISOString();
      const weekEnd = endOfLastWeek.toISOString();
      const monthStart = startOfMonth.toISOString();

      // Fetch data for the last week (for Peak Day/Top Project)
      const clockifyUrlWeek = `https://api.clockify.me/api/v1/workspaces/${clockifyWorkspaceId}/user/${clockifyUserId}/time-entries?start=${weekStart}&end=${weekEnd}&page-size=1000`;
      const clockifyResponseWeek = await fetch(clockifyUrlWeek, {
        headers: { 'X-Api-Key': clockifyApiKey },
      });
      if (!clockifyResponseWeek.ok) {
        throw new Error(
          `Clockify API error (Weekly) for user ${
            user.user_id
          }: ${await clockifyResponseWeek.text()}`
        );
      }
      const timeEntriesWeek = await clockifyResponseWeek.json();

      // Fetch data from start of month to end of last week (for Overall Status/Balance)
      const clockifyUrlMonth = `https://api.clockify.me/api/v1/workspaces/${clockifyWorkspaceId}/user/${clockifyUserId}/time-entries?start=${monthStart}&end=${weekEnd}&page-size=5000`;
      const clockifyResponseMonth = await fetch(clockifyUrlMonth, {
        headers: { 'X-Api-Key': clockifyApiKey },
      });
      if (!clockifyResponseMonth.ok) {
        throw new Error(
          `Clockify API error (Monthly) for user ${
            user.user_id
          }: ${await clockifyResponseMonth.text()}`
        );
      }
      const timeEntriesMonth = await clockifyResponseMonth.json();

      // --- Calculation ---
      let totalLoggedHoursWeek = 0;
      let totalLoggedHoursMonth = 0;
      let totalTargetHours = 0;
      const dailyLoggedHours: Record<string, number> = {};
      const dayNames = [
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
      ];
      const projectTotalHoursWeek: Record<
        string,
        { name: string; logged: number }
      > = {};
      const projectTotalHoursMonth: Record<string, number> = {};

      projects.forEach((project) => {
        totalTargetHours += project.target_hours;

        // Calculate Monthly Logged Hours
        const projectTimeEntriesMonth = timeEntriesMonth.filter(
          (te: any) => te.projectId === project.clockify_project_id
        );
        const totalDurationSecondsMonth = projectTimeEntriesMonth.reduce(
          (acc: number, te: any) =>
            acc + parseISO8601Duration(te.timeInterval.duration),
          0
        );
        projectTotalHoursMonth[project.clockify_project_id!] =
          totalDurationSecondsMonth / 3600;
        totalLoggedHoursMonth +=
          projectTotalHoursMonth[project.clockify_project_id!];

        // Calculate Weekly Logged Hours & Daily Breakdown
        const projectTimeEntriesWeek = timeEntriesWeek.filter(
          (te: any) => te.projectId === project.clockify_project_id
        );
        const totalDurationSecondsWeek = projectTimeEntriesWeek.reduce(
          (acc: number, te: any) => {
            const duration = parseISO8601Duration(te.timeInterval.duration);

            // Track daily totals for Peak Day calculation
            const entryDate = new Date(te.timeInterval.start);
            const dayIndex = entryDate.getDay();
            const dayName = dayNames[dayIndex];
            dailyLoggedHours[dayName] =
              (dailyLoggedHours[dayName] || 0) + duration / 3600;

            return acc + duration;
          },
          0
        );

        const loggedHoursWeek = totalDurationSecondsWeek / 3600;
        totalLoggedHoursWeek += loggedHoursWeek;
        projectTotalHoursWeek[project.clockify_project_id!] = {
          name: project.name,
          logged: loggedHoursWeek,
        };
      });

      // --- Summaries (Table Data) ---
      const week_ending_on = endOfLastWeek.toISOString().split('T')[0];

      const summaries = projects.map((project) => {
        const loggedHours =
          projectTotalHoursWeek[project.clockify_project_id!].logged;

        return {
          project_id: project.id,
          project_name: project.name,
          target_hours: project.target_hours, // Display monthly target in weekly table
          logged_hours: loggedHours,
          balance: project.target_hours - loggedHours, // Display balance against monthly target
          week_ending_on: week_ending_on,
          user_id: browserId,
        };
      });

      // --- Weekly Stats (Peak Day/Top Project) ---
      let peakDay = 'N/A';
      let peakHours = 0;
      for (const [day, hours] of Object.entries(dailyLoggedHours)) {
        if (hours > peakHours) {
          peakHours = hours;
          peakDay = day;
        }
      }

      let topProject = 'N/A';
      let topProjectHours = 0;
      Object.values(projectTotalHoursWeek).forEach((p) => {
        if (p.logged > topProjectHours) {
          topProjectHours = p.logged;
          topProject = p.name;
        }
      });

      // --- Monthly Status ---
      const overallBalance = totalTargetHours - totalLoggedHoursMonth;
      let overallStatus: 'On Pace' | 'Over Shooting' | 'Under Shooting';
      if (totalTargetHours === 0) {
        overallStatus = 'On Pace';
      } else if (Math.abs(overallBalance) < 0.05 * totalTargetHours) {
        // 5% tolerance for "On Pace"
        overallStatus = 'On Pace';
      } else if (overallBalance < 0) {
        overallStatus = 'Over Shooting';
      } else {
        overallStatus = 'Under Shooting';
      }

      const weeklyStats: WeeklyStats = {
        weeklyLoggedHours: totalLoggedHoursWeek,
        totalTargetHours: totalTargetHours,
        overallBalance: overallBalance,
        overallStatus: overallStatus,
        peakDay: peakDay,
        peakHours: peakHours,
        topProject: topProject,
        topProjectShare:
          totalLoggedHoursWeek > 0
            ? (topProjectHours / totalLoggedHoursWeek) * 100
            : 0,
      };

      const summariesToInsert = summaries.map(
        ({ project_name, balance, ...rest }) => rest
      );

      const { error: insertError } = await supabase
        .from('weekly_summaries')
        .upsert(summariesToInsert, { onConflict: 'project_id,week_ending_on' });

      if (insertError) throw insertError;

      const emailResult = await sendSummaryEmail(
        summaries,
        weeklyStats,
        user as Record<string, string>, // Pass the full user settings object
        endOfLastWeek
      );

      globalMessages.push(emailResult);
    } // End of user loop

    return new Response(
      JSON.stringify({
        message: 'Weekly summary scheduler completed.',
        details: globalMessages,
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
