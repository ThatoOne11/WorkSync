import { HistoryService } from './services/history.service.ts';
import { GetProjectHistorySchema } from './types/history.types.ts';
import { parseRequest, jsonResponse } from '../_shared/utils/api.utils.ts';

export class HistoryOrchestrator {
  constructor(private readonly service: HistoryService) {}

  async execute(req: Request): Promise<Response> {
    try {
      const body = await parseRequest(req, GetProjectHistorySchema);

      const payload = await this.service.generateHistoryReport(
        body.projectId,
        body.browserId,
      );

      return jsonResponse({ success: true, data: payload });
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
