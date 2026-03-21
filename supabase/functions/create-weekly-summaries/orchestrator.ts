import { WeeklySummariesService } from './services/weekly-summaries.service.ts';
import { requireServiceRole } from '../_shared/utils/auth.utils.ts';
import { jsonResponse } from '../_shared/utils/api.utils.ts';

export class SummariesOrchestrator {
  constructor(private readonly service: WeeklySummariesService) {}

  async execute(req: Request): Promise<Response> {
    requireServiceRole(req);

    const result = await this.service.processSummaries();

    return jsonResponse(result);
  }
}
