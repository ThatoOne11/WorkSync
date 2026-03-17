import { assertEquals } from 'jsr:@std/assert';
import { PacingAlertService } from '../services/pacing.service.ts';
import { SettingsRepository } from '../../_shared/repo/settings.repo.ts';
import {
  ProjectsRepository,
  DBProject,
} from '../../_shared/repo/projects.repo.ts';
import { AlertsRepository } from '../repo/alerts.repo.ts';
import { EmailService } from '../../_shared/services/email.service.ts';
import { UserSettings } from '../../_shared/types/app.types.ts';

Deno.test('PacingAlertService Suite', async (t) => {
  let emailSentTo = '';
  let alertsUpsertedCount = 0;

  const mockSettings: Record<string, UserSettings> = {
    user_skipped_1: { user_id: 'user_skipped_1', enablePacingAlerts: 'false' },
    user_skipped_2: {
      user_id: 'user_skipped_2',
      enablePacingAlerts: 'true',
      notificationEmail: 'skip@test.com',
    },
    user_active: {
      user_id: 'user_active',
      enablePacingAlerts: 'true',
      notificationEmail: 'target@test.com',
      clockifyApiKey: 'key',
      clockifyWorkspaceId: 'ws',
      clockifyUserId: 'c_user',
    },
  };

  const mockSettingsRepo = {
    getAllUsersSettings: () => Promise.resolve(mockSettings),
  } as unknown as SettingsRepository;

  const mockProjectsRepo = {
    getActiveProjects: () =>
      Promise.resolve([
        {
          id: 1,
          name: 'Critical Project',
          target_hours: 10,
          clockify_project_id: 'cp_1',
        },
      ] as DBProject[]),
  } as unknown as ProjectsRepository;

  const mockAlertsRepo = {
    upsertAlerts: (alerts: unknown[]) => {
      alertsUpsertedCount = alerts.length;
      return Promise.resolve();
    },
  } as unknown as AlertsRepository;

  const mockEmailService = {
    sendEmail: (to: string) => {
      emailSentTo = to;
      return Promise.resolve();
    },
  } as unknown as EmailService;

  const service = new PacingAlertService(
    mockSettingsRepo,
    mockProjectsRepo,
    mockAlertsRepo,
    mockEmailService,
  );

  await t.step(
    'processAlerts - correctly skips invalid users and alerts overshooting users',
    async () => {
      const originalFetch = globalThis.fetch;

      // Mock Clockify to return a MASSIVE time entry so variance triggers an alert
      globalThis.fetch = () =>
        Promise.resolve(
          new Response(
            JSON.stringify([
              {
                id: 'te_1',
                projectId: 'cp_1',
                timeInterval: {
                  start: new Date().toISOString(),
                  duration: 'PT100H',
                },
              },
            ]),
            { status: 200 },
          ),
        );

      const result = await service.processAlerts();

      // The two skipped users should not have triggered an email
      // Only 'user_active' should trigger the alert logic
      assertEquals(emailSentTo, 'target@test.com');
      assertEquals(alertsUpsertedCount, 1);

      // Assert the response details captured the correct events
      const skippedMissingCreds = result.details.some((d) =>
        d.includes('Missing Clockify credentials'),
      );
      const emailSentMsg = result.details.some((d) =>
        d.includes('Pacing digest sent to target@test.com'),
      );

      assertEquals(skippedMissingCreds, true);
      assertEquals(emailSentMsg, true);

      // Teardown
      globalThis.fetch = originalFetch;
    },
  );
});
