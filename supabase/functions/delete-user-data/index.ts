import { createClient } from 'https://esm.sh/@supabase/supabase-js';
import { ENV } from '../_shared/configs/env.ts';
import { withEdgeWrapper } from '../_shared/utils/edge.wrapper.ts';
import { SettingsRepository } from '../_shared/repo/settings.repo.ts';
import { ProjectsRepository } from '../_shared/repo/projects.repo.ts';
import { SummariesRepository } from '../_shared/repo/summaries.repo.ts';
import { DeleteUserDataService } from './services/delete-user-data.service.ts';
import { DeleteUserDataController } from './controllers/delete.controller.ts';

Deno.serve(
  withEdgeWrapper('Delete-User-Data', async (req: Request) => {
    const supabase = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY);

    const settingsRepo = new SettingsRepository(supabase);
    const projectsRepo = new ProjectsRepository(supabase);
    const summariesRepo = new SummariesRepository(supabase);

    const service = new DeleteUserDataService(
      settingsRepo,
      projectsRepo,
      summariesRepo,
    );
    const controller = new DeleteUserDataController(service);

    return await controller.handleRequest(req);
  }),
);
