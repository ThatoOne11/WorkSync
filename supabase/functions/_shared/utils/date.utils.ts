export function parseISO8601Duration(
  duration: string | null | undefined,
): number {
  if (!duration) return 0;
  const regex = /P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/;
  const matches = duration.match(regex);
  if (!matches) return 0;

  const days = parseFloat(matches[1] || '0');
  const hours = parseFloat(matches[2] || '0');
  const minutes = parseFloat(matches[3] || '0');
  const seconds = parseFloat(matches[4] || '0');

  return days * 24 * 3600 + hours * 3600 + minutes * 60 + seconds;
}

export function getWorkdaysInMonth(year: number, month: number): number {
  let workdays = 0;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const currentDate = new Date(year, month, day);
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek > 0 && dayOfWeek < 6) {
      workdays++;
    }
  }
  return workdays > 0 ? workdays : 20;
}

export function getPassedWorkdays(today: Date): number {
  let passedWorkdays = 0;
  const year = today.getFullYear();
  const month = today.getMonth();
  for (let day = 1; day <= today.getDate(); day++) {
    const currentDate = new Date(year, month, day);
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek > 0 && dayOfWeek < 6) {
      passedWorkdays++;
    }
  }
  return passedWorkdays > 0 ? passedWorkdays : 1;
}

export function getWeekOfMonth(date: Date): number {
  const d = new Date(date);
  const firstDayOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
  const firstDayWeekday = firstDayOfMonth.getDay(); // 0 (Sun) to 6 (Sat)

  // Align offsets so Monday is the start of a standard week
  const offset =
    firstDayWeekday === 1 ? 0 : firstDayWeekday === 0 ? 6 : firstDayWeekday - 1;
  const adjustedDate = d.getDate() + offset;

  return Math.ceil(adjustedDate / 7);
}

export function getWeekDates(
  today: Date,
  weekNumber: number,
): { start: string; end: string } {
  const year = today.getFullYear();
  const month = today.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  let start: Date;
  let end: Date;

  if (weekNumber === 1) {
    start = new Date(firstDayOfMonth);
    // Find the first Sunday
    const daysToSunday = (7 - start.getDay()) % 7;
    end = new Date(year, month, 1 + daysToSunday);
  } else {
    // Find the first Monday
    const daysToFirstMonday = (8 - firstDayOfMonth.getDay()) % 7;
    const firstMonday = new Date(year, month, 1 + daysToFirstMonday);

    start = new Date(year, month, firstMonday.getDate() + (weekNumber - 2) * 7);
    end = new Date(year, month, start.getDate() + 6);
  }

  // Cap the end date to the end of the month so weeks don't bleed into the next month
  const lastDayOfMonth = new Date(year, month + 1, 0);
  if (end > lastDayOfMonth) {
    end = lastDayOfMonth;
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return { start: start.toISOString(), end: end.toISOString() };
}
