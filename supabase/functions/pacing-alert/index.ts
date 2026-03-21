import { createClient } from 'https://esm.sh/@supabase/supabase-js';
import { ENV } from '../_shared/configs/env.ts';
import { withEdgeWrapper } from '../_shared/utils/edge.wrapper.ts';
import { SettingsRepository } from '../_shared/repo/settings.repo.ts';
import { ProjectsRepository } from '../_shared/repo/projects.repo.ts';
import { AlertsRepository } from './repo/alerts.repo.ts';
import { EmailService } from '../_shared/services/email.service.ts';
import { PacingAlertService } from './services/pacing.service.ts';
import { PacingAlertOrchestrator } from './orchestrator.ts';

Deno.serve(
  withEdgeWrapper('Pacing-Alert-Cron', async (req: Request) => {
    const supabase = createClient(
      ENV.SUPABASE_URL,
      ENV.SUPABASE_SERVICE_ROLE_KEY,
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
    const orchestrator = new PacingAlertOrchestrator(service);

    return await orchestrator.execute(req);
  }),
);
