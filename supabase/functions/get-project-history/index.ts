import { createClient } from 'https://esm.sh/@supabase/supabase-js';
import { SUPABASE_CONFIG } from '../_shared/config.ts';
import { withEdgeWrapper } from '../_shared/utils/edge.wrapper.ts';
import { ProjectsRepository } from '../_shared/repo/projects.repo.ts';
import { SummariesRepository } from '../_shared/repo/summaries.repo.ts';
import { HistoryService } from './services/history.service.ts';
import { HistoryController } from './controllers/history.controller.ts';

Deno.serve(
  withEdgeWrapper('Get-Project-History', async (req: Request) => {
    const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

    const projectsRepo = new ProjectsRepository(supabase);
    const summariesRepo = new SummariesRepository(supabase);

    const service = new HistoryService(projectsRepo, summariesRepo);
    const controller = new HistoryController(service);

    return await controller.handleRequest(req);
  }),
);
