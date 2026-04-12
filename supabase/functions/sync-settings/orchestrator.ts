import { SyncSettingsService } from './services/sync-settings.service.ts';
import { SyncSettingsRequestSchema } from './types/sync.types.ts';
import { parseRequest, jsonResponse } from '../_shared/utils/api.utils.ts';

export class SyncSettingsOrchestrator {
  constructor(private readonly service: SyncSettingsService) {}

  async execute(req: Request): Promise<Response> {
    try {
      const body = await parseRequest(req, SyncSettingsRequestSchema);

      await this.service.sync(body.browserId, body.settings);

      return jsonResponse({
        success: true,
        data: { message: 'Settings synced successfully.' },
      });
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
