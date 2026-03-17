import { assertEquals, assertStringIncludes } from 'jsr:@std/assert';
import { SuggestionsService } from '../services/suggestions.service.ts';
import {
  ProjectsRepository,
  DBProject,
} from '../../_shared/repo/projects.repo.ts';
import { ClockifyService } from '../../_shared/services/clockify.service.ts';

Deno.test('SuggestionsService Suite', async (t) => {
  const mockClockify = {
    fetchUserTimeEntries: () => Promise.resolve([]),
  } as unknown as ClockifyService;

  await t.step(
    'getSuggestions - returns early if user has no active projects',
    async () => {
      const mockEmptyRepo = {
        getActiveProjects: () => Promise.resolve([]),
      } as unknown as ProjectsRepository;

      const service = new SuggestionsService(mockEmptyRepo);
      const suggestions = await service.getSuggestions(
        'browser_123',
        mockClockify,
        'user_123',
      );

      assertEquals(suggestions.length, 1);
      assertStringIncludes(suggestions[0], 'No active projects found');
    },
  );

  await t.step(
    'getSuggestions - executes standard flow with active projects',
    async () => {
      const mockProjects: DBProject[] = [
        {
          id: 1,
          name: 'Test Project',
          target_hours: 40,
          clockify_project_id: 'cp_1',
        },
      ];

      const mockPopulatedRepo = {
        getActiveProjects: () => Promise.resolve(mockProjects),
      } as unknown as ProjectsRepository;

      // We intercept fetch inside ClockifyService for this test
      const originalFetch = globalThis.fetch;
      globalThis.fetch = () =>
        Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));

      const realClockify = new ClockifyService('api_key', 'ws_id');
      const service = new SuggestionsService(mockPopulatedRepo);

      const suggestions = await service.getSuggestions(
        'browser_123',
        realClockify,
        'user_123',
      );

      // Even with 0 hours logged (empty fetch), it should return the default "Great work!" or weekend message
      assertEquals(suggestions.length > 0, true);

      globalThis.fetch = originalFetch; // Teardown
    },
  );
});
