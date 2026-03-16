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
  const firstDayOfMonth = new Date(d.getFullYear(), d.getMonth(), 1).getDay();
  const offsetDate = d.getDate() + firstDayOfMonth - 1;
  return Math.floor(offsetDate / 7) + 1;
}

export function getWeekDates(
  today: Date,
  weekNumber: number,
): { start: string; end: string } {
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const firstMonday = new Date(firstDayOfMonth);
  if (firstDayOfMonth.getDay() !== 1) {
    firstMonday.setDate(
      firstMonday.getDate() + ((8 - firstDayOfMonth.getDay()) % 7),
    );
  }

  let weekStartDate: Date;
  if (weekNumber === 1) {
    weekStartDate = firstDayOfMonth;
  } else {
    weekStartDate = new Date(firstMonday);
    weekStartDate.setDate(firstMonday.getDate() + (weekNumber - 2) * 7);
  }
  weekStartDate.setHours(0, 0, 0, 0);

  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekStartDate.getDate() + 6);
  weekEndDate.setHours(23, 59, 59, 999);

  return { start: weekStartDate.toISOString(), end: weekEndDate.toISOString() };
}
