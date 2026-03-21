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
    const body = await parseRequest(req, GenerateSuggestionsSchema);

    const { clockifyService, clockifyUserId } =
      await createAuthenticatedClockify(body.browserId, this.settingsRepo);

    const suggestions = await this.service.getSuggestions(
      body.browserId,
      clockifyService,
      clockifyUserId,
    );

    return jsonResponse({ suggestions });
  }
}
