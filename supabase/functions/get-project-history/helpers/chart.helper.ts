import { DBWeeklySummary } from '../../_shared/repo/summaries.repo.ts';

export class ChartHelper {
  static buildHistoryCharts(
    processedSummaries: (DBWeeklySummary & {
      recommendedWeeklyHours: number;
    })[],
  ) {
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

    const monthlyChartData = {
      labels: Object.keys(monthlyData),
      datasets: [
        {
          label: 'Logged Hours',
          data: Object.values(monthlyData).map((m) => m.logged),
          backgroundColor: 'rgba(255, 59, 48, 0.7)',
          borderColor: '#ff3b30',
          borderWidth: 1,
        },
        {
          label: 'Target Hours',
          data: Object.values(monthlyData).map((m) => m.target),
          backgroundColor: 'rgba(142, 142, 147, 0.7)',
          borderColor: '#8e8e93',
          borderWidth: 1,
        },
      ],
    };

    const chartData = {
      labels: processedSummaries.map(
        (s) => `Week ending ${new Date(s.week_ending_on).toLocaleDateString()}`,
      ),
      datasets: [
        {
          label: 'Logged Hours',
          data: processedSummaries.map((s) => s.logged_hours),
          borderColor: '#ff3b30',
          backgroundColor: 'rgba(255, 59, 48, 0.2)',
          fill: true,
          tension: 0.1,
        },
        {
          label: 'Recommended Hours',
          data: processedSummaries.map((s) => s.recommendedWeeklyHours),
          borderColor: '#8e8e93',
          borderDash: [5, 5],
          tension: 0.1,
        },
        {
          label: 'Allocated Hours (Monthly)',
          data: processedSummaries.map((s) => s.target_hours),
          borderColor: '#34c759',
          fill: false,
          tension: 0.1,
        },
      ],
    };

    return { monthlyChartData, chartData };
  }
}
