import { createClient } from 'https://esm.sh/@supabase/supabase-js';
import { SUPABASE_CONFIG } from '../_shared/config.ts';
import { withEdgeWrapper } from '../_shared/utils/edge.wrapper.ts';
import { ProjectsRepository } from '../_shared/repo/projects.repo.ts';
import { SettingsRepository } from '../_shared/repo/settings.repo.ts';
import { FocusService } from './services/focus.service.ts';
import { FocusController } from './controllers/focus.controller.ts';

Deno.serve(
  withEdgeWrapper('Get-Todays-Focus', async (req: Request) => {
    const supabase = createClient(
      SUPABASE_CONFIG.url,
      SUPABASE_CONFIG.serviceRoleKey,
    );

    const projectsRepo = new ProjectsRepository(supabase);
    const settingsRepo = new SettingsRepository(supabase);
    const service = new FocusService(projectsRepo);
    const controller = new FocusController(service, settingsRepo);

    return await controller.handleRequest(req);
  }),
);
