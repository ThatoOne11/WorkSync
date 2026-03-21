import { createClient } from 'https://esm.sh/@supabase/supabase-js';
import { ENV } from '../_shared/configs/env.ts';
import { withEdgeWrapper } from '../_shared/utils/edge.wrapper.ts';
import { ProjectsRepository } from '../_shared/repo/projects.repo.ts';
import { SummariesRepository } from '../_shared/repo/summaries.repo.ts';
import { HistoryService } from './services/history.service.ts';
import { HistoryOrchestrator } from './orchestrator.ts';

Deno.serve(
  withEdgeWrapper('Get-Project-History', async (req: Request) => {
    const supabase = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY);

    const projectsRepo = new ProjectsRepository(supabase);
    const summariesRepo = new SummariesRepository(supabase);

    const service = new HistoryService(projectsRepo, summariesRepo);
    const orchestrator = new HistoryOrchestrator(service);

    return await orchestrator.execute(req);
  }),
);
