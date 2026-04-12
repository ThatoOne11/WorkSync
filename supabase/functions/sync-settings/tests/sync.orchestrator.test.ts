import { assertEquals, assertStringIncludes } from 'jsr:@std/assert';
import { SyncSettingsOrchestrator } from '../orchestrator.ts';
import { SyncSettingsService } from '../services/sync-settings.service.ts';

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
    assertEquals(body.success, true);
    assertEquals(body.data.message, 'Settings synced successfully.');
  });

  await t.step(
    'execute - returns 400 JSON error if browserId is missing',
    async () => {
      const invalidPayload = { settings: { apiKey: 'clockify_key' } };
      const req = new Request('https://mock.com', {
        method: 'POST',
        body: JSON.stringify(invalidPayload),
      });

      const res = await orchestrator.execute(req);
      const body = await res.json();

      assertEquals(res.status, 400);
      assertEquals(body.success, false);
      assertStringIncludes(body.error, 'invalid_type');
    },
  );
});
