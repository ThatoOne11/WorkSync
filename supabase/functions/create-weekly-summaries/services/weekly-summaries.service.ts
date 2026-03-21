import { SettingsRepository } from '../../_shared/repo/settings.repo.ts';
import { ProjectsRepository } from '../../_shared/repo/projects.repo.ts';
import { SummariesRepository } from '../../_shared/repo/summaries.repo.ts';
import { ClockifyService } from '../../_shared/services/clockify.service.ts';
import { EmailService } from '../../_shared/services/email.service.ts';
import { GeminiService } from '../../_shared/services/gemini.service.ts';
import { WeeklyStatsHelper } from '../helpers/weekly-stats.helper.ts';
import { ClockifyAggregator } from '../helpers/clockify-aggregator.helper.ts';
import { ReportGenerator } from '../helpers/report-generator.helper.ts';
import {
  getWorkdaysInMonth,
  getWeekOfMonth,
} from '../../_shared/utils/date.utils.ts';
import { WeeklySummariesResult } from '../types/summaries.types.ts';

export class WeeklySummariesService {
  private readonly geminiService: GeminiService;

  constructor(
    private readonly settingsRepo: SettingsRepository,
    private readonly projectsRepo: ProjectsRepository,
    private readonly summariesRepo: SummariesRepository,
    private readonly emailService: EmailService,
  ) {
    this.geminiService = new GeminiService();
  }

  async processSummaries(): Promise<WeeklySummariesResult> {
    const usersSettings = await this.settingsRepo.getAllUsersSettings();
    const globalMessages: string[] = [];

    const today = new Date();
    const endOfLastWeek = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - today.getDay(),
    );
    endOfLastWeek.setHours(23, 59, 59, 999);

    const workdaysInMonth = getWorkdaysInMonth(
      today.getFullYear(),
      today.getMonth(),
    );
    const currentWeekNumber = getWeekOfMonth(endOfLastWeek);

    for (const [userId, user] of Object.entries(usersSettings)) {
      if (user.enableEmailNotifications !== 'true' || !user.notificationEmail)
        continue;
      if (
        !user.clockifyApiKey ||
        !user.clockifyWorkspaceId ||
        !user.clockifyUserId
      )
        continue;

      try {
        const projects = await this.projectsRepo.getActiveProjects(userId);
        if (projects.length === 0) continue;

        const clockify = new ClockifyService(
          user.clockifyApiKey,
          user.clockifyWorkspaceId,
        );

        // 1. Data Aggregation
        const { allMonthlyData, summariesToUpsert, thisWeeksTimeEntries } =
          await ClockifyAggregator.fetchAndAggregate(
            clockify,
            projects,
            userId,
            user.clockifyUserId,
            today,
            currentWeekNumber,
            workdaysInMonth,
          );

        // 2. Database Persistence
        await this.summariesRepo.upsertSummaries(summariesToUpsert);

        // 3. Stats Calculation
        const thisWeekData = allMonthlyData.filter(
          (d) => d.week_ending_on === endOfLastWeek.toISOString().split('T')[0],
        );
        const weeklyStats = WeeklyStatsHelper.calculateWeeklyStats(
          thisWeekData,
          projects,
          thisWeeksTimeEntries,
          allMonthlyData,
        );

        // Ask Gemini for the customized intro paragraph
        const insightText =
          await this.geminiService.generateWeeklySummaryInsight(
            weeklyStats,
            thisWeekData,
          );

        // 4. Report Generation & Dispatch
        await ReportGenerator.generateAndSend(
          this.emailService,
          user.notificationEmail,
          endOfLastWeek,
          weeklyStats,
          thisWeekData,
          allMonthlyData,
          currentWeekNumber,
          insightText,
        );

        globalMessages.push(
          `Weekly summary sent to ${user.notificationEmail}.`,
        );
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        globalMessages.push(`Failed to process user ${userId}: ${errMsg}`);
        console.error(`Error processing user ${userId}:`, errMsg);
      }
    }

    return {
      message: 'Weekly summary scheduler completed.',
      details: globalMessages,
    };
  }
}
