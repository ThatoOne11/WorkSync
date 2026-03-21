import { WeeklySummariesService } from './services/weekly-summaries.service.ts';
import { requireServiceRole } from '../_shared/utils/auth.utils.ts';

export class SummariesOrchestrator {
  constructor(private readonly service: WeeklySummariesService) {}

  async execute(req: Request): Promise<Response> {
    requireServiceRole(req);
    const result = await this.service.processSummaries();

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
