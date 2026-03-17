import { SettingsRepository } from '../../_shared/repo/settings.repo.ts';
import { UserSettings } from '../../_shared/types/app.types.ts';
import { SyncSettingsRequest } from '../types/sync.types.ts';

export class SyncSettingsService {
  constructor(private readonly settingsRepo: SettingsRepository) {}

  async sync(
    browserId: string,
    settings: SyncSettingsRequest['settings'],
  ): Promise<void> {
    const mappedSettings: Partial<UserSettings> = {
      clockifyApiKey: settings.apiKey,
      clockifyWorkspaceId: settings.workspaceId,
      clockifyUserId: settings.userId,
      notificationEmail: settings.notificationEmail,
      enableEmailNotifications: String(
        settings.enableEmailNotifications || false,
      ),
      enablePacingAlerts: String(settings.enablePacingAlerts || false),
    };

    await this.settingsRepo.upsertSettings(browserId, mappedSettings);
  }
}
