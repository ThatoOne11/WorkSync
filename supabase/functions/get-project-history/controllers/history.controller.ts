import { HistoryService } from '../services/history.service.ts';
import {
  GetProjectHistoryRequest,
  GetProjectHistorySchema,
} from '../types/history.types.ts';
import { ValidationError } from '../../_shared/exceptions/custom.exceptions.ts';
import { toSafeError } from '../../_shared/utils/error.utils.ts';

export class HistoryController {
  constructor(private readonly service: HistoryService) {}

  async handleRequest(req: Request): Promise<Response> {
    let body: GetProjectHistoryRequest;

    try {
      const rawBody = await req.json();
      body = GetProjectHistorySchema.parse(rawBody);
    } catch (err: unknown) {
      throw new ValidationError(`Invalid payload: ${toSafeError(err).message}`);
    }

    const payload = await this.service.generateHistoryReport(
      body.projectId,
      body.browserId,
    );

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
