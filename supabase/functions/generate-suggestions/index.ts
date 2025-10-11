import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

// --- HELPER FUNCTIONS ---

// CORRECT and ROBUST duration parser (reused from other functions)
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

function getWorkdaysInMonth(year, month) {
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

function getPassedWorkdays(today) {
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

    // FIX: Read settings from the request body
    const { settings } = await req.json();
    if (!settings) {
      throw new Error('Settings were not provided in the request body.');
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
      .select('name, target_hours, clockify_project_id');

    if (projectsError) throw projectsError;

    const today = new Date();
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
        .filter((te) => te.projectId === p.clockify_project_id)
        .reduce(
          (sum, te) => sum + parseISO8601Duration(te.timeInterval.duration),
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
      .sort((a, b) => b.variance - a.variance);
    const projectsBurningHot = highVarianceProjects.filter(
      (p) => p.variance > 0
    );
    const projectsBurningCold = highVarianceProjects.filter(
      (p) => p.variance < 0
    );

    if (projectsBurningHot.length > 0 && projectsBurningCold.length > 0) {
      const hotProject = projectsBurningHot[0];
      const coldProject = projectsBurningCold[0];
      suggestions.push(
        `Pacing Alert: You are on track to go over by ${hotProject.variance.toFixed(
          1
        )} hours on "${
          hotProject.name
        }". To balance, consider shifting some focus to "${
          coldProject.name
        }", which is currently tracking under budget.`
      );
    } else if (projectsBurningHot.length > 0) {
      const hotProject = projectsBurningHot[0];
      suggestions.push(
        `Pacing Alert: You are working too fast on "${
          hotProject.name
        }" and are projected to exceed your target by ${hotProject.variance.toFixed(
          1
        )} hours. Consider slowing down to avoid burnout.`
      );
    } else if (projectsBurningCold.length > 0) {
      const coldProject = projectsBurningCold[0];
      suggestions.push(
        `Pacing Check: You are currently behind schedule on "${
          coldProject.name
        }" and are projected to be ${Math.abs(coldProject.variance).toFixed(
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
