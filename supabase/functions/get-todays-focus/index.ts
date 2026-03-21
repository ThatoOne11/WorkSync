import { createClient } from 'https://esm.sh/@supabase/supabase-js';
import { ENV } from '../_shared/configs/env.ts';
import { withEdgeWrapper } from '../_shared/utils/edge.wrapper.ts';
import { ProjectsRepository } from '../_shared/repo/projects.repo.ts';
import { SettingsRepository } from '../_shared/repo/settings.repo.ts';
import { FocusService } from './services/focus.service.ts';
import { FocusController } from './controllers/focus.controller.ts';

Deno.serve(
  withEdgeWrapper('Get-Todays-Focus', async (req: Request) => {
    const supabase = createClient(
      ENV.SUPABASE_URL,
      ENV.SUPABASE_SERVICE_ROLE_KEY,
    );

    const projectsRepo = new ProjectsRepository(supabase);
    const settingsRepo = new SettingsRepository(supabase);
    const service = new FocusService(projectsRepo);
    const controller = new FocusController(service, settingsRepo);

    return await controller.handleRequest(req);
  }),
);
