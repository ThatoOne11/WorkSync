import { assertEquals, assertRejects } from 'jsr:@std/assert';
import { EmailService } from '../services/email.service.ts';
import { EMAIL_CONFIG } from '../config.ts';
import { DownstreamSyncError } from '../exceptions/custom.exceptions.ts';

Deno.test('EmailService Suite', async (t) => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = EMAIL_CONFIG.resendApiKey;

  await t.step(
    'sendEmail - skips sending if RESEND_API_KEY is not configured',
    async () => {
      EMAIL_CONFIG.resendApiKey = undefined;
      const service = new EmailService();

      let fetchCalled = false;
      globalThis.fetch = () => {
        fetchCalled = true;
        return Promise.resolve(new Response());
      };

      await service.sendEmail('test@test.com', 'Subject', '<p>HTML</p>');

      // Fetch should never be triggered
      assertEquals(fetchCalled, false);
    },
  );

  await t.step('sendEmail - successfully dispatches email', async () => {
    EMAIL_CONFIG.resendApiKey = 'valid_key';
    const service = new EmailService();

    let capturedBody: any;
    globalThis.fetch = (_url, options) => {
      capturedBody = JSON.parse(options?.body as string);
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
      EMAIL_CONFIG.resendApiKey = 'valid_key';
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
  EMAIL_CONFIG.resendApiKey = originalApiKey;
});
