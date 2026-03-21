// Parses an ISO 8601 duration string into total seconds.
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

// Checks if a given date (defaults to today) is a weekend.
export function isWeekend(date: Date = new Date()): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

// Generates an array of the previous 'n' month names (e.g., ["March", "February", "January"]).
export function getPreviousMonthNames(
  count: number,
  referenceDate: Date = new Date(),
): string[] {
  return Array.from({ length: count }).map((_, i) => {
    const d = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth() - (i + 1),
      1,
    );
    return d.toLocaleString('default', { month: 'long' });
  });
}
