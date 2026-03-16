import { ClockifyDataService } from '../services/clockify-data.service.ts';
import { ClockifyService } from '../../_shared/services/clockify.service.ts';
import {
  GetClockifyDataRequest,
  GetClockifyDataSchema,
} from '../types/clockify-data.types.ts';
import { ValidationError } from '../../_shared/exceptions/custom.exceptions.ts';
import { toSafeError } from '../../_shared/utils/error.utils.ts';

export class ClockifyDataController {
  constructor(private readonly service: ClockifyDataService) {}

  async handleRequest(req: Request): Promise<Response> {
    let body: GetClockifyDataRequest;

    try {
      const rawBody = await req.json();
      body = GetClockifyDataSchema.parse(rawBody);
    } catch (err: unknown) {
      throw new ValidationError(`Invalid payload: ${toSafeError(err).message}`);
    }

    const clockify = new ClockifyService(body.apiKey, body.workspaceId);
    const data = await this.service.processAction(body, clockify);

    return new Response(JSON.stringify({ data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
