import { BackfillService } from '../services/backfill.service.ts';
import { ClockifyService } from '../../_shared/services/clockify.service.ts';
import {
  BackfillRequest,
  BackfillRequestSchema,
} from '../types/backfill.types.ts';
import { ValidationError } from '../../_shared/exceptions/custom.exceptions.ts';
import { toSafeError } from '../../_shared/utils/error.utils.ts';
import { SettingsRepository } from '../../_shared/repo/settings.repo.ts';

export class BackfillController {
  constructor(
    private readonly service: BackfillService,
    private readonly settingsRepo: SettingsRepository,
  ) {}

  async handleRequest(req: Request): Promise<Response> {
    let body: BackfillRequest;

    try {
      const rawBody = await req.json();
      body = BackfillRequestSchema.parse(rawBody);
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

    const result = await this.service.runBackfill(
      body.browserId,
      body.historicalTargets,
      clockifyService,
      userSettings.clockifyUserId,
    );

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
