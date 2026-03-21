import { EmailService } from '../../_shared/services/email.service.ts';
import { ProjectSummary, WeeklyStats } from '../../_shared/types/app.types.ts';
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
    insightText: string,
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

    // ALL HARDCODED LOGIC DELETED FROM HERE! 🎉

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
