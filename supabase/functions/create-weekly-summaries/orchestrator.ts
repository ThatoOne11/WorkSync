import { WeeklySummariesService } from './services/weekly-summaries.service.ts';
import { jsonResponse } from '../_shared/utils/api.utils.ts';

export class SummariesOrchestrator {
  constructor(private readonly service: WeeklySummariesService) {}

  async execute(req: Request): Promise<Response> {
    let targetUserId: string | undefined = undefined;

    try {
      // Manual runs from the frontend send a JSON body
      const body = await req.clone().json();
      if (body?.browserId) {
        targetUserId = body.browserId;
      }
    } catch {}

    if (!req.headers.get('Authorization')) {
      throw new Error('Unauthorized: Missing API token.');
    }

    const result = await this.service.processSummaries(targetUserId);

    return jsonResponse(result);
  }
}
