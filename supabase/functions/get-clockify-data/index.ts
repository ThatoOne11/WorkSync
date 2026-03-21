import { createClient } from 'https://esm.sh/@supabase/supabase-js';
import { SUPABASE_CONFIG } from '../_shared/config.ts';
import { withEdgeWrapper } from '../_shared/utils/edge.wrapper.ts';
import { SettingsRepository } from '../_shared/repo/settings.repo.ts';
import { ClockifyDataService } from './services/clockify-data.service.ts';
import { ClockifyDataController } from './controllers/clockify-data.controller.ts';

Deno.serve(
  withEdgeWrapper('Get-Clockify-Data', async (req: Request) => {
    const supabase = createClient(
      SUPABASE_CONFIG.url,
      SUPABASE_CONFIG.serviceRoleKey,
    );
    const settingsRepo = new SettingsRepository(supabase);

    const service = new ClockifyDataService();
    const controller = new ClockifyDataController(service, settingsRepo);

    return await controller.handleRequest(req);
  }),
);
