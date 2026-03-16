import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from 'jsr:@std/assert';
import { PacingAlertController } from '../controllers/pacing.controller.ts';
import { PacingAlertService } from '../services/pacing.service.ts';
import { SUPABASE_CONFIG } from '../../_shared/config.ts';

Deno.test('PacingAlertController Security Suite', async (t) => {
  const mockService = {
    processAlerts: () => Promise.resolve({ message: 'Success', details: [] }),
  } as unknown as PacingAlertService;

  const controller = new PacingAlertController(mockService);

  // Store the original secret to restore it after the test
  const originalSecret = SUPABASE_CONFIG.serviceRoleKey;

  await t.step(
    'handleRequest - throws Unauthorized if Auth header is missing',
    async () => {
      SUPABASE_CONFIG.serviceRoleKey = 'secure_cron_secret_123';

      const req = new Request('https://mock.com', { method: 'POST' }); // No headers

      const error = await assertRejects(
        () => controller.handleRequest(req),
        Error,
      );
      assertStringIncludes(error.message, 'Unauthorized');
    },
  );

  await t.step(
    'handleRequest - throws Unauthorized if Auth header is incorrect',
    async () => {
      SUPABASE_CONFIG.serviceRoleKey = 'secure_cron_secret_123';

      const req = new Request('https://mock.com', {
        method: 'POST',
        headers: { Authorization: 'Bearer hacker_guess_token' },
      });

      const error = await assertRejects(
        () => controller.handleRequest(req),
        Error,
      );
      assertStringIncludes(error.message, 'Unauthorized');
    },
  );

  await t.step(
    'handleRequest - returns 200 OK if Service Role token perfectly matches',
    async () => {
      SUPABASE_CONFIG.serviceRoleKey = 'secure_cron_secret_123';

      const req = new Request('https://mock.com', {
        method: 'POST',
        headers: { Authorization: 'Bearer secure_cron_secret_123' },
      });

      const res = await controller.handleRequest(req);
      const body = await res.json();

      assertEquals(res.status, 200);
      assertEquals(body.message, 'Success');
    },
  );

  // Teardown: Restore the original secret so we don't break other tests
  SUPABASE_CONFIG.serviceRoleKey = originalSecret;
});
