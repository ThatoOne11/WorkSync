import { ProjectsRepository } from '../../_shared/repo/projects.repo.ts';
import { SummariesRepository } from '../../_shared/repo/summaries.repo.ts';
import { getWorkdaysInMonth } from '../../_shared/utils/date.utils.ts';
import { ChartHelper } from '../../_shared/helpers/chart.helper.ts';
import { InsightsHelper } from '../../_shared/helpers/insights.helper.ts';
import { HistoryResponsePayload } from '../types/history.types.ts';

export class HistoryService {
  constructor(
    private readonly projectsRepo: ProjectsRepository,
    private readonly summariesRepo: SummariesRepository,
  ) {}

  async generateHistoryReport(
    projectId: number,
    userId: string,
  ): Promise<HistoryResponsePayload> {
    const project = await this.projectsRepo.getProjectById(projectId, userId);
    const summaries = await this.summariesRepo.getSummariesByProject(
      projectId,
      userId,
    );

    const processedSummaries = summaries.map((s) => {
      const weekDate = new Date(s.week_ending_on);
      const workdays = getWorkdaysInMonth(
        weekDate.getFullYear(),
        weekDate.getMonth(),
      );
      const recommendedWeeklyHours =
        s.target_hours > 0 ? (s.target_hours / workdays) * 5 : 0;

      return { ...s, recommendedWeeklyHours };
    });

    const trackedSummaries = processedSummaries.filter(
      (s) => s.target_hours > 0,
    );

    const totalLoggedHours = processedSummaries.reduce(
      (acc, s) => acc + s.logged_hours,
      0,
    );
    const totalTrackedLoggedHours = trackedSummaries.reduce(
      (acc, s) => acc + s.logged_hours,
      0,
    );
    const totalRecommendedHours = trackedSummaries.reduce(
      (acc, s) => acc + s.recommendedWeeklyHours,
      0,
    );

    const pacingVariance = totalRecommendedHours - totalTrackedLoggedHours;
    const averageWeeklyBurn =
      trackedSummaries.length > 0
        ? totalTrackedLoggedHours / trackedSummaries.length
        : 0;

    const mostProductiveWeek = processedSummaries.reduce(
      (max, s) => (s.logged_hours > max.logged_hours ? s : max),
      processedSummaries[0] || { logged_hours: 0, week_ending_on: 'N/A' },
    );

    // Delegate presentation logic to helpers
    const insights = InsightsHelper.generateHistoryInsights(trackedSummaries);
    const { monthlyChartData, chartData } =
      ChartHelper.buildHistoryCharts(processedSummaries);

    return {
      projectName: project.name,
      keyMetrics: {
        totalLoggedHours,
        targetHours: project.target_hours,
        averageWeeklyBurn,
        pacingVariance,
        mostProductiveWeek: {
          logged_hours: mostProductiveWeek.logged_hours,
          week_ending_on: mostProductiveWeek.week_ending_on,
        },
      },
      chartData,
      monthlyChartData,
      insights,
    };
  }
}
