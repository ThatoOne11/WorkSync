import { assertEquals, assertRejects } from 'jsr:@std/assert';
import { ClockifyService } from '../services/clockify.service.ts';
import { DownstreamSyncError } from '../exceptions/custom.exceptions.ts';

Deno.test('ClockifyService Suite', async (t) => {
  const service = new ClockifyService('dummy_api_key', 'dummy_workspace_id');
  const originalFetch = globalThis.fetch;

  await t.step(
    'fetchUserTimeEntries - parses VALID data successfully',
    async () => {
      globalThis.fetch = () => {
        return Promise.resolve(
          new Response(
            JSON.stringify([
              {
                id: 'entry_1',
                projectId: 'proj_1',
                timeInterval: {
                  start: '2026-02-01T09:00:00Z',
                  duration: 'PT2H',
                },
              },
            ]),
            { status: 200 },
          ),
        );
      };

      const entries = await service.fetchUserTimeEntries(
        'user_1',
        'start',
        'end',
      );
      assertEquals(entries.length, 1);
      assertEquals(entries[0].id, 'entry_1');
    },
  );

  await t.step(
    'fetchUserTimeEntries - throws Zod Error on INVALID data',
    async () => {
      globalThis.fetch = () => {
        return Promise.resolve(
          new Response(
            JSON.stringify([
              {
                id: 'entry_1',
                // MISSING timeInterval object entirely! Zod should catch this.
              },
            ]),
            { status: 200 },
          ),
        );
      };

      // Zod throws a standard Error (or ZodError) which is caught by our Edge Wrapper
      await assertRejects(
        () => service.fetchUserTimeEntries('user_1', 'start', 'end'),
        Error,
      );
    },
  );

  await t.step(
    'fetchUserTimeEntries - throws DownstreamSyncError on 401 Unauthorized',
    async () => {
      globalThis.fetch = () => {
        return Promise.resolve(
          new Response('Invalid API Key', { status: 401 }),
        );
      };

      await assertRejects(
        () => service.fetchUserTimeEntries('user_1', 'start', 'end'),
        DownstreamSyncError,
        'Clockify API Error',
      );
    },
  );

  // Teardown
  globalThis.fetch = originalFetch;
});
