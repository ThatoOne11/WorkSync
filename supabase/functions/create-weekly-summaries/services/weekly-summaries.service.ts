import { SettingsRepository } from '../../_shared/repo/settings.repo.ts';
import { ProjectsRepository } from '../../_shared/repo/projects.repo.ts';
import {
  SummariesRepository,
  DBWeeklySummary,
} from '../../_shared/repo/summaries.repo.ts';
import { ClockifyService } from '../../_shared/services/clockify.service.ts';
import { EmailService } from '../../_shared/services/email.service.ts';
import { EmailHelper } from '../../_shared/helpers/email.helper.ts';
import { WeeklyStatsHelper } from '../../_shared/helpers/weekly-stats.helper.ts';
import {
  getWorkdaysInMonth,
  getWeekOfMonth,
  getWeekDates,
  parseISO8601Duration,
} from '../../_shared/utils/date.utils.ts';
import { ProjectSummary } from '../../_shared/types/app.types.ts';
import { ClockifyTimeEntry } from '../../_shared/types/clockify.types.ts';
import { WeeklySummariesResult } from '../types/summaries.types.ts';

export class WeeklySummariesService {
  constructor(
    private readonly settingsRepo: SettingsRepository,
    private readonly projectsRepo: ProjectsRepository,
    private readonly summariesRepo: SummariesRepository,
    private readonly emailService: EmailService,
  ) {}

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
      if (user.enableEmailNotifications !== 'true' || !user.notificationEmail) {
        continue;
      }

      if (
        !user.clockifyApiKey ||
        !user.clockifyWorkspaceId ||
        !user.clockifyUserId
      ) {
        globalMessages.push(
          `Skipping user ${userId}: Clockify credentials missing.`,
        );
        continue;
      }

      try {
        const projects = await this.projectsRepo.getActiveProjects(userId);
        if (projects.length === 0) continue;

        const clockify = new ClockifyService(
          user.clockifyApiKey,
          user.clockifyWorkspaceId,
        );

        const allMonthlyData: ProjectSummary[] = [];
        const summariesToUpsert: DBWeeklySummary[] = [];
        let thisWeeksTimeEntries: ClockifyTimeEntry[] = [];

        for (let i = 1; i <= currentWeekNumber; i++) {
          const weekDates = getWeekDates(today, i);
          const timeEntries = await clockify.fetchUserTimeEntries(
            user.clockifyUserId,
            weekDates.start,
            weekDates.end,
          );

          if (i === currentWeekNumber) {
            thisWeeksTimeEntries = timeEntries;
          }

          const weeklySummaries = projects.map((project) => {
            const loggedSeconds = timeEntries
              .filter((te) => te.projectId === project.clockify_project_id)
              .reduce(
                (acc, te) =>
                  acc + parseISO8601Duration(te.timeInterval.duration),
                0,
              );

            const logged_hours = loggedSeconds / 3600;
            const recommended_hours =
              (project.target_hours / workdaysInMonth) * 5;

            return {
              project_id: project.id,
              project_name: project.name,
              user_id: userId,
              target_hours: project.target_hours,
              logged_hours,
              week_ending_on: weekDates.end.split('T')[0],
              recommended_hours,
              balance: recommended_hours - logged_hours,
            };
          });

          allMonthlyData.push(...weeklySummaries);
          summariesToUpsert.push(
            ...weeklySummaries.map((s) => ({
              project_id: s.project_id,
              user_id: s.user_id,
              target_hours: s.target_hours,
              logged_hours: s.logged_hours,
              week_ending_on: s.week_ending_on,
            })),
          );
        }

        await this.summariesRepo.upsertSummaries(summariesToUpsert);

        // Delegate complex calculation to the helper
        const thisWeekData = allMonthlyData.filter(
          (d) => d.week_ending_on === endOfLastWeek.toISOString().split('T')[0],
        );
        const weeklyStats = WeeklyStatsHelper.calculateWeeklyStats(
          thisWeekData,
          projects,
          thisWeeksTimeEntries,
          allMonthlyData,
        );

        const formattedDate = endOfLastWeek.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
        const isLastWeekOfMonth =
          new Date(
            endOfLastWeek.getFullYear(),
            endOfLastWeek.getMonth() + 1,
            0,
          ).getDate() -
            endOfLastWeek.getDate() <
          7;

        const weeklyBalanceAbs = Math.abs(weeklyStats.weeklyBalance).toFixed(2);
        let insightText = `You logged <span style="font-weight: 700;">${weeklyStats.weeklyLoggedHours.toFixed(2)} hours</span> this week, compared to your recommended weekly target of ${weeklyStats.recommendedWeeklyHours.toFixed(2)} hours.`;

        if (weeklyStats.weeklyBalance > 0.1) {
          insightText += ` You were <span style="color: ${EmailHelper.getStatusColor('Under Shooting')}; font-weight: 700;">under by ${weeklyBalanceAbs} hours.</span>`;
        } else if (weeklyStats.weeklyBalance < -0.1) {
          insightText += ` You went <span style="color: ${EmailHelper.getStatusColor('Over Shooting')}; font-weight: 700;">over by ${weeklyBalanceAbs} hours.</span> Review your pacing to avoid burnout.`;
        } else {
          insightText += ` You hit your target almost exactly! Excellent consistency.`;
        }

        const tableHeaders = EmailHelper.buildWeeklyTableHeaders(
          currentWeekNumber,
          isLastWeekOfMonth,
        );
        const tableRows = EmailHelper.buildWeeklyTableRows(
          thisWeekData,
          allMonthlyData,
          currentWeekNumber,
          isLastWeekOfMonth,
        );

        await this.emailService.sendWeeklySummary(
          user.notificationEmail,
          formattedDate,
          insightText,
          tableHeaders,
          tableRows,
          weeklyStats,
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
