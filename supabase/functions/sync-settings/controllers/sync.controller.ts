import { SyncSettingsService } from '../services/sync-settings.service.ts';
import {
  SyncSettingsRequest,
  SyncSettingsRequestSchema,
} from '../types/sync.types.ts';
import { ValidationError } from '../../_shared/exceptions/custom.exceptions.ts';
import { toSafeError } from '../../_shared/utils/error.utils.ts';

export class SyncSettingsController {
  constructor(private readonly service: SyncSettingsService) {}

  async handleRequest(req: Request): Promise<Response> {
    let body: SyncSettingsRequest;

    try {
      const rawBody = await req.json();
      body = SyncSettingsRequestSchema.parse(rawBody);
    } catch (err: unknown) {
      throw new ValidationError(`Invalid payload: ${toSafeError(err).message}`);
    }

    await this.service.sync(body.browserId, body.settings);

    return new Response(
      JSON.stringify({ message: 'Settings synced successfully.' }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}
