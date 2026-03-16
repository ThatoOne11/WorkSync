import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from 'jsr:@std/assert';
import { FocusController } from '../controllers/focus.controller.ts';
import { FocusService } from '../services/focus.service.ts';
import { ValidationError } from '../../_shared/exceptions/custom.exceptions.ts';

Deno.test('FocusController Suite', async (t) => {
  const mockService = {
    calculateTodaysFocus: () =>
      Promise.resolve([{ name: 'Test Project', requiredHoursToday: 2.5 }]),
  } as unknown as FocusService;

  const controller = new FocusController(mockService);

  await t.step(
    'handleRequest - returns 200 OK and focus list for a valid payload',
    async () => {
      const validPayload = {
        browserId: 'browser_123',
        settings: {
          apiKey: 'api_key',
          workspaceId: 'ws_123',
          userId: 'user_123',
        },
      };

      const req = new Request('https://mock.com', {
        method: 'POST',
        body: JSON.stringify(validPayload),
      });

      const res = await controller.handleRequest(req);
      const body = await res.json();

      assertEquals(res.status, 200);
      assertEquals(body.focusList.length, 1);
      assertEquals(body.focusList[0].requiredHoursToday, 2.5);
    },
  );

  await t.step(
    'handleRequest - throws ValidationError if nested clockify credentials are missing',
    async () => {
      const invalidPayload = {
        browserId: 'browser_123',
        settings: {
          apiKey: 'api_key',
          // Missing workspaceId and userId
        },
      };

      const req = new Request('https://mock.com', {
        method: 'POST',
        body: JSON.stringify(invalidPayload),
      });

      const error = await assertRejects(
        () => controller.handleRequest(req),
        ValidationError,
      );
      assertStringIncludes(error.message, 'Required');
    },
  );
});
