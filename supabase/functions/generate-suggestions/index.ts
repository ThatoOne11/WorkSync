import { createClient } from 'https://esm.sh/@supabase/supabase-js';
import { withEdgeWrapper } from '../_shared/utils/edge.wrapper.ts';
import { ProjectsRepository } from '../_shared/repo/projects.repo.ts';
import { SettingsRepository } from '../_shared/repo/settings.repo.ts';
import { SuggestionsService } from './services/suggestions.service.ts';
import { SuggestionsOrchestrator } from './orchestrator.ts';
import { ENV } from '../_shared/configs/env.ts';

Deno.serve(
  withEdgeWrapper('Generate-Suggestions', async (req: Request) => {
    const supabase = createClient(
      ENV.SUPABASE_URL,
      ENV.SUPABASE_SERVICE_ROLE_KEY,
    );

    const projectsRepo = new ProjectsRepository(supabase);
    const settingsRepo = new SettingsRepository(supabase);
    const service = new SuggestionsService(projectsRepo);
    const orchestrator = new SuggestionsOrchestrator(service, settingsRepo);

    return await orchestrator.execute(req);
  }),
);
