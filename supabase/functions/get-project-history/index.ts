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

interface WeeklySummary {
  week_ending_on: string;
  logged_hours: number;
  target_hours: number;
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

// --- MAIN FUNCTION ---
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { projectId, browserId, settings } = await req.json();
    if (!projectId || !browserId || !settings) {
      throw new Error('Project ID, Browser ID, or settings not provided.');
    }

    const supabase: SupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Fetch Project Details & Weekly Summaries
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('name, target_hours, clockify_project_id')
      .eq('id', projectId)
      .eq('user_id', browserId)
      .single();

    if (projectError) throw projectError;

    const { data: summaries, error: summariesError } = await supabase
      .from('weekly_summaries')
      .select('week_ending_on, logged_hours, target_hours')
      .eq('project_id', projectId)
      .eq('user_id', browserId)
      .order('week_ending_on', { ascending: true });

    if (summariesError) throw summariesError;

    // 2. Calculate Key Metrics
    const totalLoggedHours = summaries.reduce(
      (acc, s) => acc + s.logged_hours,
      0
    );
    const averageWeeklyBurn =
      summaries.length > 0 ? totalLoggedHours / summaries.length : 0;
    const mostProductiveWeek = summaries.reduce(
      (max, s) => (s.logged_hours > max.logged_hours ? s : max),
      summaries[0] || { logged_hours: 0, week_ending_on: 'N/A' }
    );
    const pacingVariance = project.target_hours - totalLoggedHours;

    // 3. Generate Insights
    const insights = [];
    const overshootThreshold = 1.1; // 10% over
    const undershootThreshold = 0.9; // 10% under

    const weeklyPerformance = summaries.map((s) => ({
      ...s,
      performance: s.logged_hours / s.target_hours,
    }));

    const overshootingWeeks = weeklyPerformance.filter(
      (s) => s.performance > overshootThreshold
    ).length;
    const undershootingWeeks = weeklyPerformance.filter(
      (s) => s.performance < undershootThreshold && s.logged_hours > 0
    ).length;

    if (overshootingWeeks / summaries.length > 0.5) {
      insights.push(
        `You have logged more than your allocated hours for ${overshootingWeeks} of the last ${summaries.length} weeks. This could be a sign of scope creep or underestimation. Consider reviewing project requirements.`
      );
    }

    if (undershootingWeeks / summaries.length > 0.5) {
      insights.push(
        `This project has been consistently under its weekly hour target. If the project is on track, you may be over-allocating hours here.`
      );
    }

    const today = new Date();
    const remainingWorkdays = getRemainingWorkdays(today);
    if (
      pacingVariance > 0 &&
      new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() -
        today.getDate() <
        7
    ) {
      const requiredDailyPace = pacingVariance / remainingWorkdays;
      insights.push(
        `You have ${pacingVariance.toFixed(
          2
        )} hours left to log in the final week. Your required daily pace is now ${requiredDailyPace.toFixed(
          2
        )} hours/day.`
      );
    }

    // 4. Prepare Chart Data
    const chartData = {
      labels: summaries.map(
        (s) => `Week ending ${new Date(s.week_ending_on).toLocaleDateString()}`
      ),
      datasets: [
        {
          label: 'Logged Hours',
          data: summaries.map((s) => s.logged_hours),
          borderColor: '#ff3b30',
          backgroundColor: 'rgba(255, 59, 48, 0.2)',
          fill: true,
          tension: 0.1,
        },
        {
          label: 'Allocated Hours',
          data: summaries.map((s) => s.target_hours),
          borderColor: '#8e8e93',
          borderDash: [5, 5],
          tension: 0.1,
        },
      ],
    };

    const responsePayload = {
      keyMetrics: {
        totalLoggedHours,
        targetHours: project.target_hours,
        averageWeeklyBurn,
        pacingVariance,
        mostProductiveWeek,
      },
      chartData,
      insights,
    };

    return new Response(JSON.stringify(responsePayload), {
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

function getRemainingWorkdays(today: Date) {
  let remainingWorkdays = 0;
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let day = today.getDate(); day <= daysInMonth; day++) {
    const currentDate = new Date(year, month, day);
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek > 0 && dayOfWeek < 6) {
      remainingWorkdays++;
    }
  }
  return remainingWorkdays > 0 ? remainingWorkdays : 1;
}
