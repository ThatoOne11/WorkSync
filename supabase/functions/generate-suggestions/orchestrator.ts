import { SuggestionsService } from './services/suggestions.service.ts';
import { GenerateSuggestionsSchema } from './types/suggestions.types.ts';
import { SettingsRepository } from '../_shared/repo/settings.repo.ts';
import { parseRequest, jsonResponse } from '../_shared/utils/api.utils.ts';
import { createAuthenticatedClockify } from '../_shared/helpers/clockify.helpers.ts';

export class SuggestionsOrchestrator {
  constructor(
    private readonly service: SuggestionsService,
    private readonly settingsRepo: SettingsRepository,
  ) {}

  async execute(req: Request): Promise<Response> {
    try {
      const body = await parseRequest(req, GenerateSuggestionsSchema);

      const { clockifyService, clockifyUserId } =
        await createAuthenticatedClockify(body.browserId, this.settingsRepo);

      const suggestions = await this.service.getSuggestions(
        body.browserId,
        clockifyService,
        clockifyUserId,
      );

      return jsonResponse({ success: true, data: { suggestions } });
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
