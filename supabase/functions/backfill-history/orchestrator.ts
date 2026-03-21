import { BackfillService } from './services/backfill.service.ts';
import { BackfillRequestSchema } from './types/backfill.types.ts';
import { SettingsRepository } from '../_shared/repo/settings.repo.ts';
import { parseRequest, jsonResponse } from '../_shared/utils/api.utils.ts';
import { createAuthenticatedClockify } from '../_shared/helpers/clockify.helpers.ts';

export class BackfillOrchestrator {
  constructor(
    private readonly service: BackfillService,
    private readonly settingsRepo: SettingsRepository,
  ) {}

  async execute(req: Request): Promise<Response> {
    const body = await parseRequest(req, BackfillRequestSchema);

    const { clockifyService, clockifyUserId } =
      await createAuthenticatedClockify(body.browserId, this.settingsRepo);

    const result = await this.service.runBackfill(
      body.browserId,
      body.historicalTargets,
      clockifyService,
      clockifyUserId,
    );

    return jsonResponse(result);
  }
}
