import { createClient } from 'https://esm.sh/@supabase/supabase-js';
import { SUPABASE_CONFIG } from '../_shared/config.ts';
import { withEdgeWrapper } from '../_shared/utils/edge.wrapper.ts';
import { SettingsRepository } from '../_shared/repo/settings.repo.ts';
import { ProjectsRepository } from '../_shared/repo/projects.repo.ts';
import { SummariesRepository } from '../_shared/repo/summaries.repo.ts';
import { EmailService } from '../_shared/services/email.service.ts';
import { WeeklySummariesService } from './services/weekly-summaries.service.ts';
import { WeeklySummariesController } from './controllers/summaries.controller.ts';

Deno.serve(
  withEdgeWrapper('Create-Weekly-Summaries-Cron', async (req: Request) => {
    // Use Service Role to bypass RLS
    const supabase = createClient(
      SUPABASE_CONFIG.url,
      SUPABASE_CONFIG.serviceRoleKey,
    );

    const settingsRepo = new SettingsRepository(supabase);
    const projectsRepo = new ProjectsRepository(supabase);
    const summariesRepo = new SummariesRepository(supabase);
    const emailService = new EmailService();

    const service = new WeeklySummariesService(
      settingsRepo,
      projectsRepo,
      summariesRepo,
      emailService,
    );
    const controller = new WeeklySummariesController(service);

    return await controller.handleRequest(req);
  }),
);
