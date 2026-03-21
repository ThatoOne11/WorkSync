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
          throw new Error();
        }
      } catch {
        throw new Error(
          'Unauthorized: Service Role token required for global runs, or browserId required for individual test runs.',
        );
      }
    }
    const result = await this.service.processSummaries(targetUserId);

    return jsonResponse(result);
  }
}
