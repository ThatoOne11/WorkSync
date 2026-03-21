import { createClient } from 'https://esm.sh/@supabase/supabase-js';
import { SUPABASE_CONFIG } from '../_shared/config.ts';
import { withEdgeWrapper } from '../_shared/utils/edge.wrapper.ts';
import { SettingsRepository } from '../_shared/repo/settings.repo.ts';
import { SyncSettingsService } from './services/sync-settings.service.ts';
import { SyncSettingsController } from './controllers/sync.controller.ts';

Deno.serve(
  withEdgeWrapper('Sync-Settings', async (req: Request) => {
    const supabase = createClient(
      SUPABASE_CONFIG.url,
      SUPABASE_CONFIG.serviceRoleKey,
    );

    const repo = new SettingsRepository(supabase);
    const service = new SyncSettingsService(repo);
    const controller = new SyncSettingsController(service);

    return await controller.handleRequest(req);
  }),
);
