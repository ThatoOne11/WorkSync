import { DBWeeklySummary } from '../../_shared/repo/summaries.repo.ts';

export class InsightsHelper {
  static generateHistoryInsights(
    trackedSummaries: (DBWeeklySummary & { recommendedWeeklyHours: number })[],
  ): string[] {
    const insights: string[] = [];
    if (trackedSummaries.length <= 1) return insights;

    const overshootThreshold = 1.1;
    const burnoutThreshold = 1.5;
    let consecutiveOvershoots = 0;

    for (const s of trackedSummaries) {
      if (s.logged_hours > s.recommendedWeeklyHours * overshootThreshold) {
        consecutiveOvershoots++;
      } else {
        consecutiveOvershoots = 0;
      }

      if (consecutiveOvershoots >= 3) {
        insights.push(
          `You have logged more than recommended for ${consecutiveOvershoots} consecutive weeks. The project may require more time than allocated.`,
        );
        break;
      }
    }

    const burnoutWeek = trackedSummaries.find(
      (s) => s.logged_hours > s.recommendedWeeklyHours * burnoutThreshold,
    );
    if (burnoutWeek) {
      insights.push(
        `On the week ending ${new Date(burnoutWeek.week_ending_on).toLocaleDateString()}, you logged ${burnoutWeek.logged_hours.toFixed(1)} hours, significantly exceeding the recommended ${burnoutWeek.recommendedWeeklyHours.toFixed(1)} hours. Remember to pace yourself.`,
      );
    }

    return insights;
  }
}
