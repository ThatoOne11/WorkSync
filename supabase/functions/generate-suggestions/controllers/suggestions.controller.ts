import { SuggestionsService } from '../services/suggestions.service.ts';
import { ClockifyService } from '../../_shared/services/clockify.service.ts';
import {
  GenerateSuggestionsRequest,
  GenerateSuggestionsSchema,
} from '../types/suggestions.types.ts';
import { ValidationError } from '../../_shared/exceptions/custom.exceptions.ts';
import { toSafeError } from '../../_shared/utils/error.utils.ts';

export class SuggestionsController {
  constructor(private readonly service: SuggestionsService) {}

  async handleRequest(req: Request): Promise<Response> {
    let body: GenerateSuggestionsRequest;

    try {
      const rawBody = await req.json();
      body = GenerateSuggestionsSchema.parse(rawBody);
    } catch (err: unknown) {
      throw new ValidationError(`Invalid payload: ${toSafeError(err).message}`);
    }

    const clockifyService = new ClockifyService(
      body.settings.apiKey,
      body.settings.workspaceId,
    );

    const suggestions = await this.service.getSuggestions(
      body.browserId,
      clockifyService,
      body.settings.userId,
    );

    return new Response(JSON.stringify({ suggestions }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
