import { EmailService } from '../../_shared/services/email.service.ts';
import { ProjectSummary, WeeklyStats } from '../../_shared/types/app.types.ts';
import { EmailTheme } from '../../_shared/constants/email.constants.ts';
import { SummaryTableHelper } from './summary-table.helper.ts';
import { buildWeeklySummaryTemplate } from '../templates/weekly-summary.template.ts';

export class ReportGenerator {
  static async generateAndSend(
    emailService: EmailService,
    notificationEmail: string,
    endOfLastWeek: Date,
    weeklyStats: WeeklyStats,
    thisWeekData: ProjectSummary[],
    allMonthlyData: ProjectSummary[],
    currentWeekNumber: number,
  ): Promise<void> {
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
      insightText += ` You were <span style="color: ${EmailTheme.INFO_COLOR}; font-weight: 700;">under by ${weeklyBalanceAbs} hours.</span>`;
    } else if (weeklyStats.weeklyBalance < -0.1) {
      insightText += ` You went <span style="color: ${EmailTheme.DANGER_COLOR}; font-weight: 700;">over by ${weeklyBalanceAbs} hours.</span> Review your pacing to avoid burnout.`;
    } else {
      insightText += ` You hit your target almost exactly! Excellent consistency.`;
    }

    const tableHeaders = SummaryTableHelper.buildHeaders(
      currentWeekNumber,
      isLastWeekOfMonth,
    );
    const tableRows = SummaryTableHelper.buildRows(
      thisWeekData,
      allMonthlyData,
      currentWeekNumber,
      isLastWeekOfMonth,
    );
    const emailHtml = buildWeeklySummaryTemplate(
      insightText,
      tableHeaders,
      tableRows,
      weeklyStats,
    );

    await emailService.sendEmail(
      notificationEmail,
      `Weekly Pacing Report: Week Of ${formattedDate}`,
      emailHtml,
    );
  }
}
