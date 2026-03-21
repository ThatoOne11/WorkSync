import { ClockifyDataService } from './services/clockify-data.service.ts';
import { ClockifyService } from '../_shared/services/clockify.service.ts';
import {
  GetClockifyDataRequest,
  GetClockifyDataSchema,
} from './types/clockify-data.types.ts';
import { ValidationError } from '../_shared/exceptions/custom.exceptions.ts';
import { toSafeError } from '../_shared/utils/error.utils.ts';
import { SettingsRepository } from '../_shared/repo/settings.repo.ts';

export class ClockifyDataOrchestrator {
  constructor(
    private readonly service: ClockifyDataService,
    private readonly settingsRepo: SettingsRepository,
  ) {}

  async execute(req: Request): Promise<Response> {
    let body: GetClockifyDataRequest;

    try {
      const rawBody = await req.json();
      body = GetClockifyDataSchema.parse(rawBody);
    } catch (err: unknown) {
      throw new ValidationError(`Invalid payload: ${toSafeError(err).message}`);
    }

    let actualApiKey = body.apiKey;
    let actualWorkspaceId = body.workspaceId;
    let actualUserId = body.userId;

    if (actualApiKey === '••••••••••••••••') {
      if (!body.browserId)
        throw new ValidationError(
          'Browser ID is required to fetch secure credentials.',
        );

      const userSettings = await this.settingsRepo.getUserSettings(
        body.browserId,
      );
      if (!userSettings?.clockifyApiKey)
        throw new ValidationError('No secure API key found for this user.');

      actualApiKey = userSettings.clockifyApiKey;
      actualWorkspaceId = userSettings.clockifyWorkspaceId || actualWorkspaceId;
      actualUserId = userSettings.clockifyUserId || actualUserId;
    }

    const clockify = new ClockifyService(actualApiKey, actualWorkspaceId);
    body.userId = actualUserId;

    const data = await this.service.processAction(body, clockify);

    return new Response(JSON.stringify({ data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
