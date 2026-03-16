import { createClient } from 'https://esm.sh/@supabase/supabase-js';
import { SUPABASE_CONFIG } from '../_shared/config.ts';
import { withEdgeWrapper } from '../_shared/utils/edge.wrapper.ts';
import { SettingsRepository } from '../_shared/repo/settings.repo.ts';
import { ProjectsRepository } from '../_shared/repo/projects.repo.ts';
import { AlertsRepository } from '../_shared/repo/alerts.repo.ts';
import { EmailService } from '../_shared/services/email.service.ts';
import { PacingAlertService } from './services/pacing.service.ts';
import { PacingAlertController } from './controllers/pacing.controller.ts';

Deno.serve(
  withEdgeWrapper('Pacing-Alert-Cron', async (req: Request) => {
    // Use Service Role to bypass RLS for system-wide background jobs
    const supabase = createClient(
      SUPABASE_CONFIG.url,
      SUPABASE_CONFIG.serviceRoleKey,
    );

    const settingsRepo = new SettingsRepository(supabase);
    const projectsRepo = new ProjectsRepository(supabase);
    const alertsRepo = new AlertsRepository(supabase);
    const emailService = new EmailService();

    const service = new PacingAlertService(
      settingsRepo,
      projectsRepo,
      alertsRepo,
      emailService,
    );
    const controller = new PacingAlertController(service);

    return await controller.handleRequest(req);
  }),
);
