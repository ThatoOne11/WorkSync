import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  // This is needed if you're deploying functions locally
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

    // 1. Get the date from 4 weeks ago to analyze recent trends
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

    // 2. Fetch recent weekly summaries and the corresponding project names
    const { data: summaries, error } = await supabase
      .from('weekly_summaries')
      .select(
        `
        *,
        projects ( name )
      `
      )
      .gte('week_ending_on', fourWeeksAgo.toISOString().split('T')[0]);

    if (error) throw error;

    // 3. Group summaries by project
    const projectsData = summaries.reduce((acc, summary) => {
      const projectId = summary.project_id;
      if (!acc[projectId]) {
        acc[projectId] = {
          name: summary.projects.name,
          summaries: [],
        };
      }
      acc[projectId].summaries.push(summary);
      return acc;
    }, {});

    // 4. Analyze trends and generate suggestions for each project
    const suggestions = [];
    for (const projectId in projectsData) {
      const project = projectsData[projectId];
      // We need at least 3 weeks of data for a meaningful trend
      if (project.summaries.length < 3) continue;

      const avgLogged =
        project.summaries.reduce((sum, s) => sum + s.logged_hours, 0) /
        project.summaries.length;
      const target = project.summaries[0].target_hours; // Assume target is consistent
      const difference = avgLogged - target;

      // Suggest increasing target if consistently logging more hours
      if (difference > target * 0.1) {
        // If logged hours are >10% over target
        suggestions.push(
          `For "${project.name}", you've averaged ${avgLogged.toFixed(
            1
          )} hours over the last few weeks, which is more than your target of ${target}. Consider increasing your target.`
        );
      }

      // Suggest decreasing target if consistently logging fewer hours
      else if (difference < -(target * 0.1)) {
        // If logged hours are >10% under target
        suggestions.push(
          `For "${project.name}", you've averaged ${avgLogged.toFixed(
            1
          )} hours over the last few weeks, which is less than your target of ${target}. Consider decreasing your target to allocate time elsewhere.`
        );
      }
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
