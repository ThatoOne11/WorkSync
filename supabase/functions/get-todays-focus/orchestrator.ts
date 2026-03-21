import { FocusService } from './services/focus.service.ts';
import { ClockifyService } from '../_shared/services/clockify.service.ts';
import {
  GetTodaysFocusRequest,
  GetTodaysFocusSchema,
} from './types/focus.types.ts';
import { ValidationError } from '../_shared/exceptions/custom.exceptions.ts';
import { toSafeError } from '../_shared/utils/error.utils.ts';
import { SettingsRepository } from '../_shared/repo/settings.repo.ts';

export class FocusOrchestrator {
  constructor(
    private readonly service: FocusService,
    private readonly settingsRepo: SettingsRepository,
  ) {}

  async execute(req: Request): Promise<Response> {
    let body: GetTodaysFocusRequest;

    try {
      const rawBody = await req.json();
      body = GetTodaysFocusSchema.parse(rawBody);
    } catch (err: unknown) {
      throw new ValidationError(`Invalid payload: ${toSafeError(err).message}`);
    }

    const userSettings = await this.settingsRepo.getUserSettings(
      body.browserId,
    );
    if (
      !userSettings?.clockifyApiKey ||
      !userSettings?.clockifyWorkspaceId ||
      !userSettings?.clockifyUserId
    ) {
      throw new ValidationError(
        'Missing or incomplete secure Clockify credentials.',
      );
    }

    const clockifyService = new ClockifyService(
      userSettings.clockifyApiKey,
      userSettings.clockifyWorkspaceId,
    );
    const focusList = await this.service.calculateTodaysFocus(
      body.browserId,
      clockifyService,
      userSettings.clockifyUserId,
    );

    return new Response(JSON.stringify({ focusList }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
