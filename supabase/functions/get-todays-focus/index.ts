import { createClient } from 'https://esm.sh/@supabase/supabase-js';
import { SUPABASE_CONFIG } from '../_shared/config.ts';
import { withEdgeWrapper } from '../_shared/utils/edge.wrapper.ts';
import { ProjectsRepository } from '../_shared/repo/projects.repo.ts';
import { FocusService } from './services/focus.service.ts';
import { FocusController } from './controllers/focus.controller.ts';

Deno.serve(
  withEdgeWrapper('Get-Todays-Focus', async (req: Request) => {
    const supabase = createClient(
      SUPABASE_CONFIG.url,
      SUPABASE_CONFIG.anonKey,
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization') || '' },
        },
      },
    );

    const repo = new ProjectsRepository(supabase);
    const service = new FocusService(repo);
    const controller = new FocusController(service);

    return await controller.handleRequest(req);
  }),
);
