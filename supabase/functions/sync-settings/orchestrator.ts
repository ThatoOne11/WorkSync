import { SyncSettingsService } from './services/sync-settings.service.ts';
import { SyncSettingsRequestSchema } from './types/sync.types.ts';
import { parseRequest, jsonResponse } from '../_shared/utils/api.utils.ts';

export class SyncSettingsOrchestrator {
  constructor(private readonly service: SyncSettingsService) {}

  async execute(req: Request): Promise<Response> {
    const body = await parseRequest(req, SyncSettingsRequestSchema);

    await this.service.sync(body.browserId, body.settings);

    return jsonResponse({ message: 'Settings synced successfully.' });
  }
}
