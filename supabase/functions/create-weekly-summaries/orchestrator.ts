import { WeeklySummariesService } from './services/weekly-summaries.service.ts';
import { jsonResponse } from '../_shared/utils/api.utils.ts';

export class SummariesOrchestrator {
  constructor(private readonly service: WeeklySummariesService) {}

  async execute(req: Request): Promise<Response> {
    try {
      let targetUserId: string | undefined = undefined;

      try {
        const body = (await req.clone().json()) as { browserId?: string };
        if (body?.browserId) {
          targetUserId = String(body.browserId);
        }
      } catch {
        // Body might be empty on automated cron hits; safely ignore.
      }

      if (!req.headers.get('Authorization')) {
        throw new Error('Unauthorized: Missing API token.');
      }

      const result = await this.service.processSummaries(targetUserId);

      return jsonResponse({ success: true, data: result });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'An unknown exception occurred.';
      console.error('[SummariesOrchestrator] Critical Failure:', errorMessage);

      return jsonResponse({ success: false, error: errorMessage }, 400);
    }
  }
}
