import { assertEquals } from 'jsr:@std/assert';
import {
  parseISO8601Duration,
  getWorkdaysInMonth,
  getPassedWorkdays,
  getWeekOfMonth,
  getWeekDates,
} from '../utils/date.utils.ts';

Deno.test('Date Utils Suite', async (t) => {
  await t.step(
    'parseISO8601Duration - correctly parses hours, minutes, and seconds',
    () => {
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
      const workdays = getWorkdaysInMonth(2026, 1); // Feb 2026 has exactly 20 workdays
      assertEquals(workdays, 20);
    },
  );

  await t.step(
    'getPassedWorkdays - calculates workdays up to a specific date',
    () => {
      const mockToday = new Date(2026, 1, 11);
      const passed = getPassedWorkdays(mockToday);
      assertEquals(passed, 8);
    },
  );

  await t.step('getWeekOfMonth - calculates the correct week number', () => {
    assertEquals(getWeekOfMonth(new Date(2026, 1, 1)), 1);
    assertEquals(getWeekOfMonth(new Date(2026, 1, 11)), 3);
  });

  await t.step(
    'getWeekDates - correctly calculates week boundaries for a month',
    () => {
      const mockToday = new Date(2026, 3, 15); // Month is 0-indexed, so 3 is April

      // Helper to check local dates, ignoring the exact UTC hour shift
      const assertDate = (
        isoString: string,
        expectedYear: number,
        expectedMonth: number,
        expectedDate: number,
      ) => {
        const d = new Date(isoString);
        assertEquals(d.getFullYear(), expectedYear);
        assertEquals(d.getMonth(), expectedMonth);
        assertEquals(d.getDate(), expectedDate);
      };

      // Week 1: April 1st (Wed) -> April 5th (Sun)
      const aprilWeek1 = getWeekDates(mockToday, 1);
      assertDate(aprilWeek1.start, 2026, 3, 1);
      assertDate(aprilWeek1.end, 2026, 3, 5);

      // Week 2: April 6th (Mon) -> April 12th (Sun)
      const aprilWeek2 = getWeekDates(mockToday, 2);
      assertDate(aprilWeek2.start, 2026, 3, 6);
      assertDate(aprilWeek2.end, 2026, 3, 12);

      // Week 5 (End of month cap): April 27th (Mon) -> April 30th (Thu)
      const aprilWeek5 = getWeekDates(mockToday, 5);
      assertDate(aprilWeek5.start, 2026, 3, 27);
      assertDate(aprilWeek5.end, 2026, 3, 30);
    },
  );
});
