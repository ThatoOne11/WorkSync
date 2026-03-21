import { PacingAlertService } from './services/pacing.service.ts';
import { requireServiceRole } from '../_shared/utils/auth.utils.ts';

export class PacingAlertOrchestrator {
  constructor(private readonly service: PacingAlertService) {}

  async execute(req: Request): Promise<Response> {
    requireServiceRole(req);
    const result = await this.service.processAlerts();

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
