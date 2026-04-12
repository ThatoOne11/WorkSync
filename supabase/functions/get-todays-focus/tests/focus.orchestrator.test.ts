import { assertEquals, assertStringIncludes } from 'jsr:@std/assert';
import { FocusOrchestrator } from '../orchestrator.ts';
import { FocusService } from '../services/focus.service.ts';
import { SettingsRepository } from '../../_shared/repo/settings.repo.ts';

Deno.test('FocusOrchestrator Suite', async (t) => {
  const mockService = {
    calculateTodaysFocus: () =>
      Promise.resolve([{ name: 'Test Project', requiredHoursToday: 2.5 }]),
  } as unknown as FocusService;

  const mockSettingsRepo = {
    getUserSettings: () =>
      Promise.resolve({
        clockifyApiKey: 'secure_api_key',
        clockifyWorkspaceId: 'ws_123',
        clockifyUserId: 'user_123',
      }),
  } as unknown as SettingsRepository;

  const orchestrator = new FocusOrchestrator(mockService, mockSettingsRepo);

  await t.step(
    'execute - returns 200 OK and focus list for a valid payload',
    async () => {
      const validPayload = { browserId: 'browser_123' };
      const req = new Request('https://mock.com', {
        method: 'POST',
        body: JSON.stringify(validPayload),
      });

      const res = await orchestrator.execute(req);
      const body = await res.json();

      assertEquals(res.status, 200);
      assertEquals(body.success, true);
      assertEquals(body.data.focusList.length, 1);
      assertEquals(body.data.focusList[0].requiredHoursToday, 2.5);
    },
  );

  await t.step(
    'execute - returns 400 JSON error if browserId is missing',
    async () => {
      const invalidPayload = { settings: { apiKey: 'api' } }; // Missing browserId
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
