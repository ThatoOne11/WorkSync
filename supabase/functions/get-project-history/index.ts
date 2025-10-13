import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { serve } from '@deno/server';
import { corsHeaders } from '../_shared/cors.ts';

interface WeeklySummary {
  week_ending_on: string;
  logged_hours: number;
  target_hours: number; // This is the monthly target for the week's month
}

// --- HELPER FUNCTIONS ---
function getWorkdaysInMonth(year: number, month: number): number {
  let workdays = 0;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const currentDate = new Date(year, month, day);
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek > 0 && dayOfWeek < 6) workdays++;
  }
  return workdays > 0 ? workdays : 20;
}

// --- MAIN FUNCTION ---
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { projectId, browserId } = await req.json();
    if (!projectId || !browserId) {
      throw new Error('Project ID or Browser ID not provided.');
    }

    const supabase: SupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('name, target_hours')
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

    const processedSummaries = summaries.map((s) => {
      const weekDate = new Date(s.week_ending_on);
      const workdays = getWorkdaysInMonth(
        weekDate.getFullYear(),
        weekDate.getMonth()
      );
      const recommendedWeeklyHours =
        s.target_hours > 0 ? (s.target_hours / workdays) * 5 : 0;
      return {
        ...s,
        recommendedWeeklyHours,
      };
    });

    const trackedSummaries = processedSummaries.filter(
      (s) => s.target_hours > 0
    );
    const totalLoggedHours = processedSummaries.reduce(
      (acc, s) => acc + s.logged_hours,
      0
    );

    const totalTrackedLoggedHours = trackedSummaries.reduce(
      (acc, s) => acc + s.logged_hours,
      0
    );
    const totalRecommendedHours = trackedSummaries.reduce(
      (acc, s) => acc + s.recommendedWeeklyHours,
      0
    );
    const pacingVariance = totalRecommendedHours - totalTrackedLoggedHours;
    const averageWeeklyBurn =
      trackedSummaries.length > 0
        ? totalTrackedLoggedHours / trackedSummaries.length
        : 0;

    const mostProductiveWeek = processedSummaries.reduce(
      (max, s) => (s.logged_hours > max.logged_hours ? s : max),
      processedSummaries[0] || { logged_hours: 0, week_ending_on: 'N/A' }
    );

    const insights = [];
    if (trackedSummaries.length > 1) {
      const overshootThreshold = 1.1;
      const burnoutThreshold = 1.5;

      let consecutiveOvershoots = 0;
      for (const s of trackedSummaries) {
        if (s.logged_hours > s.recommendedWeeklyHours * overshootThreshold) {
          consecutiveOvershoots++;
        } else {
          consecutiveOvershoots = 0;
        }
        if (consecutiveOvershoots >= 3) {
          insights.push(
            `You have logged more than recommended for ${consecutiveOvershoots} consecutive weeks. The project may require more time than allocated.`
          );
          break;
        }
      }

      const burnoutWeek = trackedSummaries.find(
        (s) => s.logged_hours > s.recommendedWeeklyHours * burnoutThreshold
      );
      if (burnoutWeek) {
        insights.push(
          `On the week ending ${new Date(
            burnoutWeek.week_ending_on
          ).toLocaleDateString()}, you logged ${burnoutWeek.logged_hours.toFixed(
            1
          )} hours, significantly exceeding the recommended ${burnoutWeek.recommendedWeeklyHours.toFixed(
            1
          )} hours. Remember to pace yourself.`
        );
      }
    }

    const monthlyData: { [key: string]: { logged: number; target: number } } =
      {};
    processedSummaries.forEach((s) => {
      const monthKey = new Date(s.week_ending_on).toLocaleString('default', {
        month: 'long',
        year: 'numeric',
      });
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { logged: 0, target: s.target_hours };
      }
      monthlyData[monthKey].logged += s.logged_hours;
      if (s.target_hours > 0) {
        monthlyData[monthKey].target = s.target_hours;
      }
    });

    const monthlyChartData = {
      labels: Object.keys(monthlyData),
      datasets: [
        {
          label: 'Logged Hours',
          data: Object.values(monthlyData).map((m) => m.logged),
          backgroundColor: 'rgba(255, 59, 48, 0.7)',
          borderColor: '#ff3b30',
          borderWidth: 1,
        },
        {
          label: 'Target Hours',
          data: Object.values(monthlyData).map((m) => m.target),
          backgroundColor: 'rgba(142, 142, 147, 0.7)',
          borderColor: '#8e8e93',
          borderWidth: 1,
        },
      ],
    };

    const chartData = {
      labels: processedSummaries.map(
        (s) => `Week ending ${new Date(s.week_ending_on).toLocaleDateString()}`
      ),
      datasets: [
        {
          label: 'Logged Hours',
          data: processedSummaries.map((s) => s.logged_hours),
          borderColor: '#ff3b30',
          backgroundColor: 'rgba(255, 59, 48, 0.2)',
          fill: true,
          tension: 0.1,
        },
        {
          label: 'Recommended Hours',
          data: processedSummaries.map((s) => s.recommendedWeeklyHours),
          borderColor: '#8e8e93',
          borderDash: [5, 5],
          tension: 0.1,
        },
        {
          label: 'Allocated Hours (Monthly)',
          data: processedSummaries.map((s) => s.target_hours),
          borderColor: '#34c759',
          fill: false,
          tension: 0.1,
        },
      ],
    };

    const responsePayload = {
      projectName: project.name,
      keyMetrics: {
        totalLoggedHours,
        targetHours: project.target_hours,
        averageWeeklyBurn,
        pacingVariance,
        mostProductiveWeek: {
          logged_hours: mostProductiveWeek.logged_hours,
          week_ending_on: mostProductiveWeek.week_ending_on,
        },
      },
      chartData,
      monthlyChartData,
      insights,
    };

    return new Response(JSON.stringify(responsePayload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
