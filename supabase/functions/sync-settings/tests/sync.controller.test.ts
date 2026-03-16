import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from 'jsr:@std/assert';
import { SyncSettingsController } from '../controllers/sync.controller.ts';
import { SyncSettingsService } from '../services/sync-settings.service.ts';
import { ValidationError } from '../../_shared/exceptions/custom.exceptions.ts';

Deno.test('SyncSettingsController Suite', async (t) => {
  // Mock the service so we don't hit the database
  const mockService = {
    sync: (_browserId: string, _settings: unknown) => Promise.resolve(),
  } as unknown as SyncSettingsService;

  const controller = new SyncSettingsController(mockService);

  await t.step(
    'handleRequest - returns 200 OK for a valid payload',
    async () => {
      const validPayload = {
        browserId: 'browser_123',
        settings: {
          apiKey: 'clockify_key',
          enableEmailNotifications: true,
        },
      };

      const req = new Request('https://mock.com', {
        method: 'POST',
        body: JSON.stringify(validPayload),
      });

      const res = await controller.handleRequest(req);
      const body = await res.json();

      assertEquals(res.status, 200);
      assertEquals(body.message, 'Settings synced successfully.');
    },
  );

  await t.step(
    'handleRequest - throws ValidationError (400) if browserId is missing',
    async () => {
      const invalidPayload = {
        settings: {
          apiKey: 'clockify_key',
        },
      };

      const req = new Request('https://mock.com', {
        method: 'POST',
        body: JSON.stringify(invalidPayload),
      });

      // The Edge Wrapper normally catches this and turns it into a 400 response.
      // Since we are testing the controller directly, we assert that it throws the exact right error.
      const error = await assertRejects(
        () => controller.handleRequest(req),
        ValidationError,
      );
      assertStringIncludes(error.message, 'Required');
    },
  );
});
