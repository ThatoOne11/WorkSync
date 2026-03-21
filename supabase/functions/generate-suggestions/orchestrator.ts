import { SuggestionsService } from './services/suggestions.service.ts';
import { ClockifyService } from '../_shared/services/clockify.service.ts';
import {
  GenerateSuggestionsRequest,
  GenerateSuggestionsSchema,
} from './types/suggestions.types.ts';
import { ValidationError } from '../_shared/exceptions/custom.exceptions.ts';
import { toSafeError } from '../_shared/utils/error.utils.ts';
import { SettingsRepository } from '../_shared/repo/settings.repo.ts';

export class SuggestionsOrchestrator {
  constructor(
    private readonly service: SuggestionsService,
    private readonly settingsRepo: SettingsRepository,
  ) {}

  async execute(req: Request): Promise<Response> {
    let body: GenerateSuggestionsRequest;

    try {
      const rawBody = await req.json();
      body = GenerateSuggestionsSchema.parse(rawBody);
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

    const suggestions = await this.service.getSuggestions(
      body.browserId,
      clockifyService,
      userSettings.clockifyUserId,
    );

    return new Response(JSON.stringify({ suggestions }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
