import { assertEquals, assertRejects } from 'jsr:@std/assert';
import { EmailService } from '../services/email.service.ts';
import { DownstreamSyncError } from '../exceptions/custom.exceptions.ts';

type MockEmailPayload = {
  to: string;
  subject: string;
  html: string;
};

Deno.test('EmailService Suite', async (t) => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = Deno.env.get('RESEND_API_KEY');

  await t.step(
    'sendEmail - skips sending if RESEND_API_KEY is not configured',
    async () => {
      Deno.env.delete('RESEND_API_KEY');
      const service = new EmailService();

      let fetchCalled = false;

      // Safely cast the mock to typeof fetch
      globalThis.fetch = (() => {
        fetchCalled = true;
        return Promise.resolve(new Response());
      }) as typeof fetch;

      await service.sendEmail('test@test.com', 'Subject', '<p>HTML</p>');

      assertEquals(fetchCalled, false);
    },
  );

  await t.step('sendEmail - successfully dispatches email', async () => {
    Deno.env.set('RESEND_API_KEY', 'valid_key');
    const service = new EmailService();

    let capturedBody: MockEmailPayload | undefined;

    // Safely cast to typeof fetch and use a type guard for options.body
    globalThis.fetch = ((_input: unknown, init?: RequestInit) => {
      if (init?.body && typeof init.body === 'string') {
        capturedBody = JSON.parse(init.body) as MockEmailPayload;
      }
      return Promise.resolve(
        new Response(JSON.stringify({ id: 'email_123' }), { status: 200 }),
      );
    }) as typeof fetch;

    await service.sendEmail(
      'user@worksync.com',
      'Test Subject',
      '<p>Test HTML</p>',
    );

    assertEquals(capturedBody?.to, 'user@worksync.com');
    assertEquals(capturedBody?.subject, 'Test Subject');
  });

  await t.step(
    'sendEmail - throws DownstreamSyncError if Resend API fails',
    async () => {
      Deno.env.set('RESEND_API_KEY', 'valid_key');
      const service = new EmailService();

      // Safely cast the mock to typeof fetch
      globalThis.fetch = (() => {
        return Promise.resolve(
          new Response(JSON.stringify({ message: 'Invalid domain' }), {
            status: 403,
          }),
        );
      }) as typeof fetch;

      await assertRejects(
        () =>
          service.sendEmail(
            'user@worksync.com',
            'Test Subject',
            '<p>Test HTML</p>',
          ),
        DownstreamSyncError,
        'Failed to send email',
      );
    },
  );

  // Teardown: Restore the original environment
  globalThis.fetch = originalFetch;
  if (originalApiKey) {
    Deno.env.set('RESEND_API_KEY', originalApiKey);
  } else {
    Deno.env.delete('RESEND_API_KEY');
  }
});
