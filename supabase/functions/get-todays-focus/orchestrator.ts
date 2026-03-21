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
    // 1. Parse and validate the request instantly
    const body = await parseRequest(req, GetTodaysFocusSchema);

    // 2. Safely get the authenticated third-party service
    const { clockifyService, clockifyUserId } =
      await createAuthenticatedClockify(body.browserId, this.settingsRepo);

    // 3. Execute business logic
    const focusList = await this.service.calculateTodaysFocus(
      body.browserId,
      clockifyService,
      clockifyUserId,
    );

    // 4. Return clean response
    return jsonResponse({ focusList });
  }
}
