import { HistoricalTarget } from '../types/backfill.types.ts';

export class BackfillHelper {
  static buildTargetMap(targets: HistoricalTarget[]): Map<string, number> {
    const targetMap = new Map<string, number>();
    const today = new Date();

    targets.forEach((projectTarget) => {
      const monthKeys = Object.keys(projectTarget).filter(
        (k) => k !== 'projectId' && k !== 'projectName',
      );

      monthKeys.forEach((key, index) => {
        const monthDate = new Date(
          today.getFullYear(),
          today.getMonth() - (index + 1),
          1,
        );
        const mapKey = `${projectTarget.projectId}-${monthDate.getFullYear()}-${monthDate.getMonth()}`;

        const val = projectTarget[key];
        const numVal = typeof val === 'number' ? val : Number(val) || 0;
        targetMap.set(mapKey, numVal);
      });
    });

    return targetMap;
  }

  static getTrailingWeekBoundaries(
    weeksAgo: number,
    today: Date,
  ): { start: string; end: string; weekEndingOn: string } {
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() - today.getDay() - 7 * weeksAgo);
    endOfWeek.setHours(23, 59, 59, 999);

    const startOfWeek = new Date(endOfWeek);
    startOfWeek.setDate(startOfWeek.getDate() - 6);
    startOfWeek.setHours(0, 0, 0, 0);

    return {
      start: startOfWeek.toISOString(),
      end: endOfWeek.toISOString(),
      weekEndingOn: endOfWeek.toISOString().split('T')[0],
    };
  }
}
