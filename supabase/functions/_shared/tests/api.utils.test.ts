import { assertEquals, assertRejects } from 'jsr:@std/assert';
import { fetchWithBackoff } from '../utils/api.utils.ts';
import { DownstreamSyncError } from '../exceptions/custom.exceptions.ts';

Deno.test('API Utils - fetchWithBackoff Suite', async (t) => {
  const originalFetch = globalThis.fetch;

  await t.step(
    'fetchWithBackoff - succeeds immediately on 200 OK',
    async () => {
      let callCount = 0;
      globalThis.fetch = () => {
        callCount++;
        return Promise.resolve(new Response('OK', { status: 200 }));
      };

      const res = await fetchWithBackoff('https://mock.com', {});
      assertEquals(res.status, 200);
      assertEquals(callCount, 1);
    },
  );

  await t.step(
    'fetchWithBackoff - retries on 429 Too Many Requests and succeeds',
    async () => {
      let callCount = 0;
      globalThis.fetch = () => {
        callCount++;
        // Fail the first time, succeed the second time
        if (callCount === 1) {
          return Promise.resolve(
            new Response('Too Many Requests', { status: 429 }),
          );
        }
        return Promise.resolve(new Response('OK', { status: 200 }));
      };

      // Note: In a real environment, this pauses for 500ms between retries.
      const res = await fetchWithBackoff('https://mock.com', {});
      assertEquals(res.status, 200);
      assertEquals(callCount, 2);
    },
  );

  await t.step(
    'fetchWithBackoff - throws DownstreamSyncError after exceeding max retries',
    async () => {
      globalThis.fetch = () => {
        return Promise.resolve(
          new Response('Too Many Requests', { status: 429 }),
        );
      };

      // We set max retries to 2 so the test doesn't take too long
      await assertRejects(
        () => fetchWithBackoff('https://mock.com', {}, 2),
        DownstreamSyncError,
        'Exceeded max retries',
      );
    },
  );

  // Teardown
  globalThis.fetch = originalFetch;
});
