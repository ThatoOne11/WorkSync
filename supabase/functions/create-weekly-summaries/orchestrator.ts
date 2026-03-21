import { WeeklySummariesService } from './services/weekly-summaries.service.ts';
import { jsonResponse } from '../_shared/utils/api.utils.ts';
import { ENV } from '../_shared/configs/env.ts';

export class SummariesOrchestrator {
  constructor(private readonly service: WeeklySummariesService) {}

  async execute(req: Request): Promise<Response> {
    const authHeader = req.headers
      .get('Authorization')
      ?.replace('Bearer ', '')
      .trim();
    const isCron = authHeader === ENV.SUPABASE_SERVICE_ROLE_KEY.trim();

    let targetUserId: string | undefined = undefined;

    if (!isCron) {
      // If triggered manually by the frontend, require a browserId payload for a secure single-user run
      try {
        const body = await req.clone().json();
        if (body?.browserId) {
          targetUserId = body.browserId;
        } else {
          throw new Error('Missing browserId in request body for manual run.');
        }
      } catch (error) {
        // Log original error for debugging, then throw a standard response
        console.error('Error handling manual trigger:', error);
        throw new Error('Unauthorized');
      }
    }
    const result = await this.service.processSummaries(targetUserId);

    return jsonResponse(result);
  }
}
