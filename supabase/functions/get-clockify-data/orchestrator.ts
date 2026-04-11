import { ClockifyDataService } from './services/clockify-data.service.ts';
import { ClockifyService } from '../_shared/services/clockify.service.ts';
import { GetClockifyDataSchema } from './types/clockify-data.types.ts';
import { ValidationError } from '../_shared/exceptions/custom.exceptions.ts';
import { SettingsRepository } from '../_shared/repo/settings.repo.ts';
import { parseRequest, jsonResponse } from '../_shared/utils/api.utils.ts';

export class ClockifyDataOrchestrator {
  constructor(
    private readonly service: ClockifyDataService,
    private readonly settingsRepo: SettingsRepository,
  ) {}

  async execute(req: Request): Promise<Response> {
    try {
      const body = await parseRequest(req, GetClockifyDataSchema);

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
        actualWorkspaceId =
          userSettings.clockifyWorkspaceId || actualWorkspaceId;
        actualUserId = userSettings.clockifyUserId || actualUserId;
      }

      const clockify = new ClockifyService(actualApiKey, actualWorkspaceId);
      body.userId = actualUserId;

      const data = await this.service.processAction(body, clockify);

      return jsonResponse({ success: true, data: { data } });
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
