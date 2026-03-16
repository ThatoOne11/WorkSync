import { FocusService } from '../services/focus.service.ts';
import { ClockifyService } from '../../_shared/services/clockify.service.ts';
import {
  GetTodaysFocusRequest,
  GetTodaysFocusSchema,
} from '../types/focus.types.ts';
import { ValidationError } from '../../_shared/exceptions/custom.exceptions.ts';
import { toSafeError } from '../../_shared/utils/error.utils.ts';

export class FocusController {
  constructor(private readonly service: FocusService) {}

  async handleRequest(req: Request): Promise<Response> {
    let body: GetTodaysFocusRequest;

    try {
      const rawBody = await req.json();
      body = GetTodaysFocusSchema.parse(rawBody);
    } catch (err: unknown) {
      throw new ValidationError(`Invalid payload: ${toSafeError(err).message}`);
    }

    // We instantiate the ClockifyService here because it requires user-specific credentials
    const clockifyService = new ClockifyService(
      body.settings.apiKey,
      body.settings.workspaceId,
    );

    const focusList = await this.service.calculateTodaysFocus(
      body.browserId,
      clockifyService,
      body.settings.userId,
    );

    return new Response(JSON.stringify({ focusList }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
