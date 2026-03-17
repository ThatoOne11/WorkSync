import { BackfillService } from '../services/backfill.service.ts';
import { ClockifyService } from '../../_shared/services/clockify.service.ts';
import {
  BackfillRequest,
  BackfillRequestSchema,
} from '../types/backfill.types.ts';
import { ValidationError } from '../../_shared/exceptions/custom.exceptions.ts';
import { toSafeError } from '../../_shared/utils/error.utils.ts';

export class BackfillController {
  constructor(private readonly service: BackfillService) {}

  async handleRequest(req: Request): Promise<Response> {
    let body: BackfillRequest;

    try {
      const rawBody = await req.json();
      body = BackfillRequestSchema.parse(rawBody);
    } catch (err: unknown) {
      throw new ValidationError(`Invalid payload: ${toSafeError(err).message}`);
    }

    const clockifyService = new ClockifyService(
      body.settings.apiKey,
      body.settings.workspaceId,
    );

    const result = await this.service.runBackfill(
      body.browserId,
      body.historicalTargets,
      clockifyService,
      body.settings.userId,
    );

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
