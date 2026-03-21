import { createClient } from 'https://esm.sh/@supabase/supabase-js';
import { ENV } from '../_shared/configs/env.ts';
import { withEdgeWrapper } from '../_shared/utils/edge.wrapper.ts';
import { SettingsRepository } from '../_shared/repo/settings.repo.ts';
import { SyncSettingsService } from './services/sync-settings.service.ts';
import { SyncSettingsOrchestrator } from './orchestrator.ts';

Deno.serve(
  withEdgeWrapper('Sync-Settings', async (req: Request) => {
    const supabase = createClient(
      ENV.SUPABASE_URL,
      ENV.SUPABASE_SERVICE_ROLE_KEY,
    );

    const repo = new SettingsRepository(supabase);
    const service = new SyncSettingsService(repo);
    const orchestrator = new SyncSettingsOrchestrator(service);

    return await orchestrator.execute(req);
  }),
);
