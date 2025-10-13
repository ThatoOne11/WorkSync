import { createClient } from '@supabase/supabase-js';
import { serve } from '@deno/server';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { settings, browserId } = await req.json();
    if (!settings || !browserId) {
      throw new Error('Settings or Browser ID not provided.');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const updates = [
      { key: 'clockifyApiKey', value: settings.apiKey || '' },
      { key: 'clockifyWorkspaceId', value: settings.workspaceId || '' },
      { key: 'clockifyUserId', value: settings.userId || '' },
      { key: 'notificationEmail', value: settings.notificationEmail || '' },
      {
        key: 'enableEmailNotifications',
        value: String(settings.enableEmailNotifications),
      },
      { key: 'enablePacingAlerts', value: String(settings.enablePacingAlerts) },
    ].map((item) => ({ ...item, user_id: browserId }));

    const { error } = await supabase.from('settings').upsert(updates, {
      onConflict: 'user_id, key',
    });

    if (error) throw error;

    return new Response(
      JSON.stringify({ message: 'Settings synced successfully.' }),
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
