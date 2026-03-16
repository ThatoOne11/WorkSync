import { assertEquals } from 'jsr:@std/assert';
import {
  parseISO8601Duration,
  getWorkdaysInMonth,
  getPassedWorkdays,
  getWeekOfMonth,
} from '../utils/date.utils.ts';

Deno.test('Date Utils Suite', async (t) => {
  await t.step(
    'parseISO8601Duration - correctly parses hours, minutes, and seconds',
    () => {
      // 2 hours, 30 mins, 15 secs = 7200 + 1800 + 15 = 9015 seconds
      const seconds = parseISO8601Duration('PT2H30M15S');
      assertEquals(seconds, 9015);
    },
  );

  await t.step(
    'parseISO8601Duration - handles partial strings gracefully',
    () => {
      const hoursOnly = parseISO8601Duration('PT5H');
      assertEquals(hoursOnly, 18000);

      const emptyOrNull = parseISO8601Duration(null);
      assertEquals(emptyOrNull, 0);
    },
  );

  await t.step(
    'getWorkdaysInMonth - calculates correct workdays excluding weekends',
    () => {
      // February 2026 starts on a Sunday and has exactly 28 days.
      // It has exactly 4 full weeks -> 20 workdays.
      const workdays = getWorkdaysInMonth(2026, 1); // 1 = February (0-indexed)
      assertEquals(workdays, 20);
    },
  );

  await t.step(
    'getPassedWorkdays - calculates workdays up to a specific date',
    () => {
      // February 11th, 2026 is a Wednesday.
      // Workdays passed: 2nd-6th (5) + 9th-11th (3) = 8 workdays.
      const mockToday = new Date(2026, 1, 11);
      const passed = getPassedWorkdays(mockToday);
      assertEquals(passed, 8);
    },
  );

  await t.step('getWeekOfMonth - calculates the correct week number', () => {
    // Feb 1st, 2026 is a Sunday (Week 1)
    assertEquals(getWeekOfMonth(new Date(2026, 1, 1)), 1);

    // Feb 11th, 2026 is a Wednesday (Week 3)
    assertEquals(getWeekOfMonth(new Date(2026, 1, 11)), 3);
  });
});
