import { assertEquals, assertStringIncludes } from 'jsr:@std/assert';
import { SuggestionsService } from '../services/suggestions.service.ts';
import {
  ProjectsRepository,
  DBProject,
} from '../../_shared/repo/projects.repo.ts';
import { ClockifyService } from '../../_shared/services/clockify.service.ts';
import { GeminiService } from '../../_shared/services/gemini.service.ts';

Deno.env.set('GEMINI_API_KEY', 'mock_key_for_testing');

Deno.test('SuggestionsService Suite', async (t) => {
  const mockClockify = {
    fetchUserTimeEntries: () => Promise.resolve([]),
  } as unknown as ClockifyService;

  // IMPORTANT: Stub GeminiService and assert as any to satisfy the generic <T> requirement
  const originalGenerate = GeminiService.prototype.generateStructuredContent;
  GeminiService.prototype.generateStructuredContent = (() =>
    Promise.resolve(['Mocked AI Insight'])) as any;

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
    'getSuggestions - executes standard flow with active projects via Gemini',
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

      const service = new SuggestionsService(mockPopulatedRepo);
      const suggestions = await service.getSuggestions(
        'browser_123',
        mockClockify,
        'user_123',
      );

      assertEquals(suggestions.length, 1);
      assertEquals(suggestions[0], 'Mocked AI Insight');
    },
  );

  // Teardown
  GeminiService.prototype.generateStructuredContent = originalGenerate;
});
