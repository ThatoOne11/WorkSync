import { FocusService } from './services/focus.service.ts';
import { GetTodaysFocusSchema } from './types/focus.types.ts';
import { SettingsRepository } from '../_shared/repo/settings.repo.ts';
import { parseRequest, jsonResponse } from '../_shared/utils/api.utils.ts';
import { createAuthenticatedClockify } from '../_shared/helpers/clockify.helpers.ts';

export class FocusOrchestrator {
  constructor(
    private readonly service: FocusService,
    private readonly settingsRepo: SettingsRepository,
  ) {}

  async execute(req: Request): Promise<Response> {
    try {
      const body = await parseRequest(req, GetTodaysFocusSchema);

      const { clockifyService, clockifyUserId } =
        await createAuthenticatedClockify(body.browserId, this.settingsRepo);

      const focusList = await this.service.calculateTodaysFocus(
        body.browserId,
        clockifyService,
        clockifyUserId,
      );

      return jsonResponse({ success: true, data: { focusList } });
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
