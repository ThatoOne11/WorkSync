import { createClient } from 'https://esm.sh/@supabase/supabase-js';
import { ENV } from '../_shared/configs/env.ts';
import { withEdgeWrapper } from '../_shared/utils/edge.wrapper.ts';
import { ProjectsRepository } from '../_shared/repo/projects.repo.ts';
import { SummariesRepository } from '../_shared/repo/summaries.repo.ts';
import { SettingsRepository } from '../_shared/repo/settings.repo.ts';
import { BackfillService } from './services/backfill.service.ts';
import { BackfillOrchestrator } from './orchestrator.ts';

Deno.serve(
  withEdgeWrapper('Backfill-History', async (req: Request) => {
    const supabase = createClient(
      ENV.SUPABASE_URL,
      ENV.SUPABASE_SERVICE_ROLE_KEY,
    );

    const projectsRepo = new ProjectsRepository(supabase);
    const summariesRepo = new SummariesRepository(supabase);
    const settingsRepo = new SettingsRepository(supabase);

    const service = new BackfillService(projectsRepo, summariesRepo);
    const orchestrator = new BackfillOrchestrator(service, settingsRepo);

    return await orchestrator.execute(req);
  }),
);
