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
  return workdays > 0 ? workdays : 20; // Default to 20 if logic fails, for calculation safety
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

// Function to calculate the last full work week boundaries
function getLastWorkWeekBoundaries(today: Date) {
  const endOfWeek = new Date(today);
  // Find last Sunday (day 0) at 23:59:59 (The end of the week)
  endOfWeek.setDate(today.getDate() - today.getDay());
  endOfWeek.setHours(23, 59, 59, 999);

  // Find last Monday (6 days before Sunday) at 00:00:00 (The start of the week)
  const startOfWeek = new Date(endOfWeek);
  startOfWeek.setDate(startOfWeek.getDate() - 6);
  startOfWeek.setHours(0, 0, 0, 0);

  return { start: startOfWeek.toISOString(), end: endOfWeek.toISOString() };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Read settings from the request body
    const { settings, browserId } = await req.json();
    if (!settings || !browserId) {
      throw new Error(
        'Settings or Browser ID were not provided in the request body.'
      );
    }
    const {
      apiKey: clockifyApiKey,
      workspaceId: clockifyWorkspaceId,
      userId: clockifyUserId,
    } = settings;

    if (!clockifyApiKey || !clockifyWorkspaceId || !clockifyUserId)
      throw new Error('Clockify settings missing.');

    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('name, target_hours, clockify_project_id')
      .eq('is_archived', false)
      .eq('user_id', browserId);

    if (projectsError) throw projectsError;

    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sunday, 6=Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Check if there are any active projects before proceeding with the analysis
    if (projects.length === 0) {
      return new Response(
        JSON.stringify({
          suggestions: [
            'No active projects found. Add one on the Projects page to start tracking your pacing.',
          ],
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // WEEKEND LOGIC (WEEKLY BREAKDOWN)
    if (isWeekend) {
      const { start, end } = getLastWorkWeekBoundaries(today);
      const year = today.getFullYear();
      const month = today.getMonth();
      const totalWorkdaysInMonth = getWorkdaysInMonth(year, month);
      const workdaysPerWeek = 5;

      const timeEntriesUrl = `https://api.clockify.me/api/v1/workspaces/${clockifyWorkspaceId}/user/${clockifyUserId}/time-entries?start=${start}&end=${end}&page-size=5000`;
      const clockifyResponse = await fetch(timeEntriesUrl, {
        headers: { 'X-Api-Key': clockifyApiKey },
      });
      const timeEntries = await clockifyResponse.json();

      const weeklyBreakdown = projects.map((p) => {
        const loggedSeconds = timeEntries
          .filter((te: any) => te.projectId === p.clockify_project_id)
          .reduce(
            (sum: number, te: any) =>
              sum + parseISO8601Duration(te.timeInterval.duration),
            0
          );
        const loggedHours = loggedSeconds / 3600;

        // Calculate the fair weekly target based on monthly target
        // Monthly Target * (5 workdays / Total_Workdays_in_Month)
        const weeklyTarget =
          p.target_hours * (workdaysPerWeek / totalWorkdaysInMonth);
        const balance = loggedHours - weeklyTarget; // Positive is over, Negative is under

        return {
          name: p.name,
          loggedHours,
          weeklyTarget,
          balance,
        };
      });

      const suggestions = ["<strong>This Week's Performance Review: </strong>"];

      weeklyBreakdown.forEach((p) => {
        const variance = Math.abs(p.balance);
        const target = p.weeklyTarget;

        if (target > 0 && variance > 0.1 * target) {
          // Only check if target > 0 and variance is significant (10%)
          if (p.balance > 0) {
            suggestions.push(
              `🟢  ${p.name}: You logged ${p.loggedHours.toFixed(
                1
              )} hours, exceeding your weekly target of ${p.weeklyTarget.toFixed(
                1
              )} hours by ${variance.toFixed(
                1
              )} hours. Great dedication, but ensure you manage your pace for the remainder of the month.<br><br>`
            );
          } else {
            suggestions.push(
              `🔴 </strong> ${
                p.name
              }</strong>: You logged ${p.loggedHours.toFixed(
                1
              )} hours, falling short of your weekly target of ${p.weeklyTarget.toFixed(
                1
              )} hours by ${variance.toFixed(
                1
              )} hours. Prioritize this project next week to catch up.<br><br>`
            );
          }
        } else if (p.loggedHours > 0) {
          suggestions.push(
            `🟡 </strong> ${
              p.name
            }</strong>: You were right on pace! Logged ${p.loggedHours.toFixed(
              1
            )} hours (Target: ${p.weeklyTarget.toFixed(
              1
            )} hours). Keep this consistent next week.<br><br>`
          );
        }
      });

      if (suggestions.length <= 1) {
        // If only the header exists
        suggestions.push(
          'All projects were either on pace or had no time logged this week. Good work on maintaining balance!'
        );
      }

      return new Response(JSON.stringify({ suggestions }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // WEEKDAY LOGIC (ORIGINAL PACING ALERT)
    const startOfMonth = new Date(
      today.getFullYear(),
      today.getMonth(),
      1
    ).toISOString();
    const endOfMonth = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      0
    ).toISOString();

    const timeEntriesUrl = `https://api.clockify.me/api/v1/workspaces/${clockifyWorkspaceId}/user/${clockifyUserId}/time-entries?start=${startOfMonth}&end=${endOfMonth}&page-size=5000`;
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

      return {
        name: p.name,
        target: p.target_hours,
        projected: projectedHours,
        variance: variance,
      };
    });

    const suggestions = [];
    const highVarianceProjects = projectAnalysis
      .filter((p) => Math.abs(p.variance) > p.target * 0.1)
      .sort((a, b) => b.variance - Math.abs(a.variance));
    const projectsBurningHot = highVarianceProjects.filter(
      (p) => p.variance > 0
    );
    const projectsBurningCold = highVarianceProjects.filter(
      (p) => p.variance < 0
    );

    // Day-to-day logic
    const formatBold = (text: string) => `<strong>${text}</strong>`;

    if (projectsBurningHot.length > 0 && projectsBurningCold.length > 0) {
      const hotProject = projectsBurningHot[0];
      const coldProject = projectsBurningCold[0];
      suggestions.push(
        `Pacing Alert: You are on track to go over by ${hotProject.variance.toFixed(
          1
        )} hours on "${formatBold(
          hotProject.name
        )}". To balance, consider shifting some focus to "${formatBold(
          coldProject.name
        )}", which is currently tracking under budget.`
      );
    } else if (projectsBurningHot.length > 0) {
      const hotProject = projectsBurningHot[0];
      suggestions.push(
        `Pacing Alert: You are working too much on "${formatBold(
          hotProject.name
        )}" and are projected to exceed your hours by ${hotProject.variance.toFixed(
          1
        )} hours. Consider slowing down to avoid burnout.`
      );
    } else if (projectsBurningCold.length > 0) {
      const coldProject = projectsBurningCold[0];
      suggestions.push(
        `Pacing Check: You are currently behind schedule on "${formatBold(
          coldProject.name
        )}" and are projected to be ${Math.abs(coldProject.variance).toFixed(
          1
        )} hours under target. Consider allocating more time here soon.`
      );
    } else {
      suggestions.push(
        'Great work! Your pacing across all projects is balanced and on track to meet your monthly targets.'
      );
    }

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
