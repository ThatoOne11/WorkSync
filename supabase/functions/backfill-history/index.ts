import { createClient } from 'https://esm.sh/@supabase/supabase-js';
import { SUPABASE_CONFIG } from '../_shared/config.ts';
import { withEdgeWrapper } from '../_shared/utils/edge.wrapper.ts';
import { ProjectsRepository } from '../_shared/repo/projects.repo.ts';
import { SummariesRepository } from '../_shared/repo/summaries.repo.ts';
import { BackfillService } from './services/backfill.service.ts';
import { BackfillController } from './controllers/backfill.controller.ts';

Deno.serve(
  withEdgeWrapper('Backfill-History', async (req: Request) => {
    const supabase = createClient(
      SUPABASE_CONFIG.url,
      SUPABASE_CONFIG.anonKey,
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization') || '' },
        },
      },
    );

    const projectsRepo = new ProjectsRepository(supabase);
    const summariesRepo = new SummariesRepository(supabase);

    const service = new BackfillService(projectsRepo, summariesRepo);
    const controller = new BackfillController(service);

    return await controller.handleRequest(req);
  }),
);
