import { assertEquals, assertStringIncludes } from 'jsr:@std/assert';
import { PacingAlertOrchestrator } from '../orchestrator.ts';
import { PacingAlertService } from '../services/pacing.service.ts';

Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'secure_cron_secret_123');

Deno.test('PacingAlertOrchestrator Security Suite', async (t) => {
  const mockService = {
    processAlerts: () => Promise.resolve({ message: 'Success', details: [] }),
  } as unknown as PacingAlertService;

  const orchestrator = new PacingAlertOrchestrator(mockService);

  await t.step(
    'execute - returns 400 JSON error if Auth header is missing',
    async () => {
      const req = new Request('https://mock.com', { method: 'POST' });

      const res = await orchestrator.execute(req);
      const body = await res.json();

      assertEquals(res.status, 400);
      assertEquals(body.success, false);
      assertStringIncludes(body.error, 'Unauthorized');
    },
  );

  await t.step(
    'execute - returns 200 OK if Service Role token perfectly matches',
    async () => {
      const req = new Request('https://mock.com', {
        method: 'POST',
        headers: { Authorization: 'Bearer secure_cron_secret_123' },
      });
      const res = await orchestrator.execute(req);
      const body = await res.json();

      assertEquals(res.status, 200);
      assertEquals(body.success, true);
      assertEquals(body.data.message, 'Success');
    },
  );
});
