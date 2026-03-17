import { WeeklySummariesService } from '../services/weekly-summaries.service.ts';
import { requireServiceRole } from '../../_shared/utils/auth.utils.ts';

export class WeeklySummariesController {
  constructor(private readonly service: WeeklySummariesService) {}

  async handleRequest(req: Request): Promise<Response> {
    // 1. Ensure only the database cron job can trigger this
    requireServiceRole(req);

    // 2. Execute business logic
    const result = await this.service.processSummaries();

    // 3. Return clean response
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
