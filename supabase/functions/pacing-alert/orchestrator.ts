import { PacingAlertService } from './services/pacing.service.ts';
import { requireServiceRole } from '../_shared/utils/auth.utils.ts';
import { jsonResponse } from '../_shared/utils/api.utils.ts';

export class PacingAlertOrchestrator {
  constructor(private readonly service: PacingAlertService) {}

  async execute(req: Request): Promise<Response> {
    try {
      requireServiceRole(req);

      const result = await this.service.processAlerts();

      return jsonResponse({ success: true, data: result });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'An unknown exception occurred.';
      console.error(
        `[${this.constructor.name}] Critical Failure:`,
        errorMessage,
      );
      return jsonResponse({ success: false, error: errorMessage }, 400);
    }
  }
}
