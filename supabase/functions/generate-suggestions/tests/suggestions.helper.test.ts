import { assertEquals, assertStringIncludes } from 'jsr:@std/assert';
import {
  SuggestionsHelper,
  ProjectVarianceData,
} from '../helpers/suggestions.helper.ts';

Deno.test('SuggestionsHelper Suite', async (t) => {
  await t.step('formatWeekdaySuggestions - detects severe overshooting', () => {
    const mockData: ProjectVarianceData[] = [
      {
        name: 'Burnout Project',
        loggedHours: 50,
        targetHours: 20,
        variance: 30,
      },
    ];

    const suggestions = SuggestionsHelper.formatWeekdaySuggestions(mockData);
    assertEquals(suggestions.length, 1);
    assertStringIncludes(
      suggestions[0],
      'working too much on <strong>Burnout Project</strong>',
    );
  });

  await t.step('formatWeekdaySuggestions - detects perfect pacing', () => {
    const mockData: ProjectVarianceData[] = [
      // Variance is only 1 hour on a 40 hour project (less than 10%), so it's ignored
      {
        name: 'Perfect Project',
        loggedHours: 20,
        targetHours: 40,
        variance: 1,
      },
    ];

    const suggestions = SuggestionsHelper.formatWeekdaySuggestions(mockData);
    assertEquals(suggestions.length, 1);
    assertEquals(
      suggestions[0],
      'Great work! Your pacing across all projects is balanced and on track to meet your monthly targets.',
    );
  });

  await t.step(
    'formatWeekdaySuggestions - balances hot and cold projects',
    () => {
      const mockData: ProjectVarianceData[] = [
        {
          name: 'Over Project',
          loggedHours: 30,
          targetHours: 10,
          variance: 20,
        },
        {
          name: 'Under Project',
          loggedHours: 2,
          targetHours: 20,
          variance: -18,
        },
      ];

      const suggestions = SuggestionsHelper.formatWeekdaySuggestions(mockData);
      assertStringIncludes(
        suggestions[0],
        'Consider shifting focus to <strong>Under Project</strong>',
      );
    },
  );
});
