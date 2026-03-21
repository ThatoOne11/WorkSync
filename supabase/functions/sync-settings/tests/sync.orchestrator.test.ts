import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from 'jsr:@std/assert';
import { SyncSettingsOrchestrator } from '../orchestrator.ts';
import { SyncSettingsService } from '../services/sync-settings.service.ts';
import { ValidationError } from '../../_shared/exceptions/custom.exceptions.ts';

Deno.test('SyncSettingsOrchestrator Suite', async (t) => {
  const mockService = {
    sync: (_browserId: string, _settings: unknown) => Promise.resolve(),
  } as unknown as SyncSettingsService;

  const orchestrator = new SyncSettingsOrchestrator(mockService);

  await t.step('execute - returns 200 OK for a valid payload', async () => {
    const validPayload = {
      browserId: 'browser_123',
      settings: { apiKey: 'clockify_key', enableEmailNotifications: true },
    };

    const req = new Request('https://mock.com', {
      method: 'POST',
      body: JSON.stringify(validPayload),
    });

    const res = await orchestrator.execute(req);
    const body = await res.json();

    assertEquals(res.status, 200);
    assertEquals(body.message, 'Settings synced successfully.');
  });

  await t.step(
    'execute - throws ValidationError (400) if browserId is missing',
    async () => {
      const invalidPayload = { settings: { apiKey: 'clockify_key' } };
      const req = new Request('https://mock.com', {
        method: 'POST',
        body: JSON.stringify(invalidPayload),
      });

      const error = await assertRejects(
        () => orchestrator.execute(req),
        ValidationError,
      );
      assertStringIncludes(error.message, 'invalid_type');
    },
  );
});
