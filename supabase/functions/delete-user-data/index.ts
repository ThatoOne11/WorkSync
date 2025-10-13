import { createClient } from '@supabase/supabase-js';
import { serve } from '@deno/server';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { browserId } = await req.json();
    if (!browserId) {
      throw new Error('Browser ID not provided.');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Concurrently delete from all tables
    await Promise.all([
      supabase.from('settings').delete().eq('user_id', browserId),
      supabase.from('projects').delete().eq('user_id', browserId),
      supabase.from('weekly_summaries').delete().eq('user_id', browserId),
    ]);

    return new Response(
      JSON.stringify({ message: 'User data deleted successfully.' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
