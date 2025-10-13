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
  return workdays > 0 ? workdays : 20; // Default for safety
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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
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

    // --- REFINED LOGIC ---
    const processedSummaries = summaries.map((s) => {
      const weekDate = new Date(s.week_ending_on);
      const workdays = getWorkdaysInMonth(
        weekDate.getFullYear(),
        weekDate.getMonth()
      );
      const recommendedWeeklyHours = (s.target_hours / workdays) * 5;
      return {
        ...s,
        recommendedWeeklyHours,
      };
    });

    const totalLoggedHours = processedSummaries.reduce(
      (acc, s) => acc + s.logged_hours,
      0
    );
    const totalRecommendedHours = processedSummaries.reduce(
      (acc, s) => acc + s.recommendedWeeklyHours,
      0
    );
    const pacingVariance = totalRecommendedHours - totalLoggedHours;

    const mostProductiveWeek = processedSummaries.reduce(
      (max, s) => (s.logged_hours > max.logged_hours ? s : max),
      processedSummaries[0] || {
        logged_hours: 0,
        week_ending_on: 'N/A',
        recommendedWeeklyHours: 0,
      }
    );

    const insights = [];
    const overshootThreshold = 1.1; // 10% over
    const undershootThreshold = 0.9; // 10% under
    const burnoutThreshold = 1.5; // 50% over weekly recommendation

    // --- NEW INSIGHT: Consecutive Overshooting ---
    let consecutiveOvershoots = 0;
    for (const s of processedSummaries) {
      if (
        s.target_hours > 0 &&
        s.logged_hours > s.recommendedWeeklyHours * overshootThreshold
      ) {
        consecutiveOvershoots++;
      } else {
        consecutiveOvershoots = 0;
      }
      if (consecutiveOvershoots >= 3) {
        insights.push(
          `You have logged more than your recommended hours for ${consecutiveOvershoots} consecutive weeks. This may indicate the project requires more time than allocated.`
        );
        break; // Only show this insight once
      }
    }

    // --- NEW INSIGHT: Burnout Warning ---
    const burnoutWeek = processedSummaries.find(
      (s) =>
        s.target_hours > 0 &&
        s.logged_hours > s.recommendedWeeklyHours * burnoutThreshold
    );
    if (burnoutWeek) {
      insights.push(
        `On the week ending ${new Date(
          burnoutWeek.week_ending_on
        ).toLocaleDateString()}, you logged ${burnoutWeek.logged_hours.toFixed(
          1
        )} hours, significantly exceeding the recommended ${burnoutWeek.recommendedWeeklyHours.toFixed(
          1
        )} hours. Remember to pace yourself to avoid burnout.`
      );
    }

    // --- CORRECTED CHART DATA ---
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
        // --- NEW DATASET ---
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
        targetHours: project.target_hours, // Current target for display
        averageWeeklyBurn: totalLoggedHours / processedSummaries.length,
        pacingVariance,
        mostProductiveWeek: {
          logged_hours: mostProductiveWeek.logged_hours,
          week_ending_on: mostProductiveWeek.week_ending_on,
        },
      },
      chartData,
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
