import { PacingAlertService } from '../services/pacing.service.ts';
import { requireServiceRole } from '../../_shared/utils/auth.utils.ts';

export class PacingAlertController {
  constructor(private readonly service: PacingAlertService) {}

  async handleRequest(req: Request): Promise<Response> {
    // 1. Ensure only the database cron job can trigger this
    requireServiceRole(req);

    // 2. Execute business logic
    const result = await this.service.processAlerts();

    // 3. Return clean response
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
