import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin, getUserClient } from '../_shared/supabase-client.ts';
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

function getWorkdaysInMonth(year: number, month: number) {
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

function getPassedWorkdays(today: Date) {
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
    const userClient = getUserClient(req);
    const { data: projects, error: projectsError } = await userClient
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

    return createJsonResponse({ suggestions });
  } catch (error) {
    return createErrorResponse(error.message);
  }
});
