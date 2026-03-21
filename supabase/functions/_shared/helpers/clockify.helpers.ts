import { SettingsRepository } from '../repo/settings.repo.ts';
import { ClockifyService } from '../services/clockify.service.ts';
import { ValidationError } from '../exceptions/custom.exceptions.ts';

export async function createAuthenticatedClockify(
  browserId: string,
  settingsRepo: SettingsRepository,
): Promise<{ clockifyService: ClockifyService; clockifyUserId: string }> {
  const userSettings = await settingsRepo.getUserSettings(browserId);

  if (
    !userSettings?.clockifyApiKey ||
    !userSettings?.clockifyWorkspaceId ||
    !userSettings?.clockifyUserId
  ) {
    throw new ValidationError(
      'Missing or incomplete secure Clockify credentials.',
    );
  }

  return {
    clockifyService: new ClockifyService(
      userSettings.clockifyApiKey,
      userSettings.clockifyWorkspaceId,
    ),
    clockifyUserId: userSettings.clockifyUserId,
  };
}
