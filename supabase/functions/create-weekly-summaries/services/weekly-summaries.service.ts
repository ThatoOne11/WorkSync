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
import { SummariesAIConfig } from '../configs/prompts.ts';

export class WeeklySummariesService {
  private readonly geminiService: GeminiService;
  private readonly CHUNK_SIZE = 5;

  constructor(
    private readonly settingsRepo: SettingsRepository,
    private readonly projectsRepo: ProjectsRepository,
    private readonly summariesRepo: SummariesRepository,
    private readonly emailService: EmailService,
  ) {
    this.geminiService = new GeminiService();
  }

  async processSummaries(
    targetUserId?: string,
  ): Promise<WeeklySummariesResult> {
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

    const userEntries = Object.entries(usersSettings);

    // Chunking Loop: Process chunks sequentially, but users within a chunk concurrently
    for (let i = 0; i < userEntries.length; i += this.CHUNK_SIZE) {
      const chunk = userEntries.slice(i, i + this.CHUNK_SIZE);

      await Promise.all(
        chunk.map(async ([userId, user]) => {
          if (targetUserId && userId !== targetUserId) return;
          if (!user.notificationEmail) return;
          if (!targetUserId && user.enableEmailNotifications !== 'true') return;

          if (
            !user.clockifyApiKey ||
            !user.clockifyWorkspaceId ||
            !user.clockifyUserId
          ) {
            return;
          }

          try {
            const projects = await this.projectsRepo.getActiveProjects(userId);
            if (projects.length === 0) return;

            const clockify = new ClockifyService(
              user.clockifyApiKey,
              user.clockifyWorkspaceId,
            );

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

            await this.summariesRepo.upsertSummaries(summariesToUpsert);

            const thisWeekData = allMonthlyData.filter(
              (d) =>
                d.week_ending_on === endOfLastWeek.toISOString().split('T')[0],
            );
            const weeklyStats = WeeklyStatsHelper.calculateWeeklyStats(
              thisWeekData,
              projects,
              thisWeeksTimeEntries,
              allMonthlyData,
            );

            let insightText: string;
            try {
              const prompt = SummariesAIConfig.buildPrompt(
                weeklyStats,
                thisWeekData,
              );
              const aiResponse =
                await this.geminiService.generateStructuredContent<{
                  insightHtml: string;
                }>(prompt, SummariesAIConfig.schema, 0.7);
              insightText = aiResponse.insightHtml;
            } catch (_e) {
              insightText = `You logged <span style="font-weight: 700;">${weeklyStats.weeklyLoggedHours.toFixed(2)} hours</span> this week. Keep up the great work keeping your projects synced!`;
            }

            await ReportGenerator.generateAndSend(
              this.emailService,
              user.notificationEmail!,
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
            const errMsg =
              error instanceof Error ? error.message : String(error);
            globalMessages.push(`Failed to process user ${userId}: ${errMsg}`);
            console.error(`Error processing user ${userId}:`, errMsg);
          }
        }),
      );
    }

    return {
      message: 'Weekly summary scheduler completed.',
      details: globalMessages,
    };
  }
}
