import { createClient } from 'https://esm.sh/@supabase/supabase-js';
import { SUPABASE_CONFIG } from '../_shared/config.ts';
import { withEdgeWrapper } from '../_shared/utils/edge.wrapper.ts';
import { ProjectsRepository } from '../_shared/repo/projects.repo.ts';
import { SettingsRepository } from '../_shared/repo/settings.repo.ts';
import { SuggestionsService } from './services/suggestions.service.ts';
import { SuggestionsController } from './controllers/suggestions.controller.ts';

Deno.serve(
  withEdgeWrapper('Generate-Suggestions', async (req: Request) => {
    const supabase = createClient(
      SUPABASE_CONFIG.url,
      SUPABASE_CONFIG.serviceRoleKey,
    );

    const projectsRepo = new ProjectsRepository(supabase);
    const settingsRepo = new SettingsRepository(supabase);
    const service = new SuggestionsService(projectsRepo);
    const controller = new SuggestionsController(service, settingsRepo);

    return await controller.handleRequest(req);
  }),
);
