import { DBWeeklySummary } from '../../_shared/repo/summaries.repo.ts';
import { CHART_COLORS } from '../constants/colours.constants.ts';
import { HistoryChartsResult, ChartData } from '../types/chart.types.ts';

export class ChartHelper {
  public static buildHistoryCharts(
    processedSummaries: (DBWeeklySummary & {
      recommendedWeeklyHours: number;
    })[],
  ): HistoryChartsResult {
    const monthlyData: Record<string, { logged: number; target: number }> = {};

    processedSummaries.forEach((s) => {
      const monthKey = new Date(s.week_ending_on).toLocaleString('default', {
        month: 'long',
        year: 'numeric',
      });
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { logged: 0, target: s.target_hours };
      }
      monthlyData[monthKey].logged += s.logged_hours;
      if (s.target_hours > 0) {
        monthlyData[monthKey].target = s.target_hours;
      }
    });

    const monthlyChartData: ChartData = {
      labels: Object.keys(monthlyData),
      datasets: [
        {
          label: 'Logged Hours',
          data: Object.values(monthlyData).map((m) => m.logged),
          backgroundColor: CHART_COLORS.LOGGED_HOURS.ALPHA_70,
          borderColor: CHART_COLORS.LOGGED_HOURS.SOLID,
          borderWidth: 1,
        },
        {
          label: 'Target Hours',
          data: Object.values(monthlyData).map((m) => m.target),
          backgroundColor: CHART_COLORS.TARGET_HOURS.ALPHA_70,
          borderColor: CHART_COLORS.TARGET_HOURS.SOLID,
          borderWidth: 1,
        },
      ],
    };

    const chartData: ChartData = {
      labels: processedSummaries.map(
        (s) => `Week ending ${new Date(s.week_ending_on).toLocaleDateString()}`,
      ),
      datasets: [
        {
          label: 'Logged Hours',
          data: processedSummaries.map((s) => s.logged_hours),
          borderColor: CHART_COLORS.LOGGED_HOURS.SOLID,
          backgroundColor: CHART_COLORS.LOGGED_HOURS.ALPHA_20,
          fill: true,
          tension: 0.1,
        },
        {
          label: 'Recommended Hours',
          data: processedSummaries.map((s) => s.recommendedWeeklyHours),
          borderColor: CHART_COLORS.TARGET_HOURS.SOLID,
          borderDash: [5, 5],
          tension: 0.1,
        },
        {
          label: 'Allocated Hours (Monthly)',
          data: processedSummaries.map((s) => s.target_hours),
          borderColor: CHART_COLORS.ALLOCATED_HOURS.SOLID,
          fill: false,
          tension: 0.1,
        },
      ],
    };

    return { monthlyChartData, chartData };
  }
}
