import { assertEquals, assertRejects } from 'jsr:@std/assert';
import { EmailService } from '../services/email.service.ts';
import { ENV } from '../configs/env.ts';
import { DownstreamSyncError } from '../exceptions/custom.exceptions.ts';

Deno.test('EmailService Suite', async (t) => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = ENV.RESEND_API_KEY;

  await t.step(
    'sendEmail - skips sending if RESEND_API_KEY is not configured',
    async () => {
      ENV.RESEND_API_KEY = undefined;
      const service = new EmailService();

      let fetchCalled = false;
      globalThis.fetch = () => {
        fetchCalled = true;
        return Promise.resolve(new Response());
      };

      await service.sendEmail('test@test.com', 'Subject', '<p>HTML</p>');

      assertEquals(fetchCalled, false);
    },
  );

  await t.step('sendEmail - successfully dispatches email', async () => {
    ENV.RESEND_API_KEY = 'valid_key';
    const service = new EmailService();

    // Type 'any' used here to capture the parsed JSON payload
    let capturedBody: any;

    globalThis.fetch = (_url, options) => {
      // FIX: Explicitly cast options to RequestInit to satisfy strict type checking
      const reqOptions = options as RequestInit;
      capturedBody = JSON.parse(reqOptions?.body as string);
      return Promise.resolve(
        new Response(JSON.stringify({ id: 'email_123' }), { status: 200 }),
      );
    };

    await service.sendEmail(
      'user@worksync.com',
      'Test Subject',
      '<p>Test HTML</p>',
    );

    assertEquals(capturedBody.to, 'user@worksync.com');
    assertEquals(capturedBody.subject, 'Test Subject');
  });

  await t.step(
    'sendEmail - throws DownstreamSyncError if Resend API fails',
    async () => {
      ENV.RESEND_API_KEY = 'valid_key';
      const service = new EmailService();

      globalThis.fetch = () => {
        return Promise.resolve(
          new Response(JSON.stringify({ message: 'Invalid domain' }), {
            status: 403,
          }),
        );
      };

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

  // Teardown
  globalThis.fetch = originalFetch;
  ENV.RESEND_API_KEY = originalApiKey;
});
