import { EMAIL_CONFIG } from '../config.ts';
import { DownstreamSyncError } from '../exceptions/custom.exceptions.ts';
import { ApiConstants } from '../constants/api.constants.ts';
import { buildPacingDigestTemplate } from '../templates/pacing-digest.template.ts';
import { buildWeeklySummaryTemplate } from '../templates/weekly-summary.template.ts';
import { EmailHelper } from '../helpers/email.helper.ts';
import { ProjectAnalysis, WeeklyStats } from '../types/app.types.ts';

export class EmailService {
  private readonly resendApiKey = EMAIL_CONFIG.resendApiKey;
  private readonly fromAddress = EMAIL_CONFIG.fromAddress;
  private readonly baseUrl = ApiConstants.RESEND_BASE_URL;

  async sendPacingDigest(
    toEmail: string,
    projects: ProjectAnalysis[],
  ): Promise<void> {
    const projectRowsHtml = EmailHelper.buildPacingProjectRows(projects);
    const htmlBody = buildPacingDigestTemplate(projectRowsHtml);

    await this.sendEmail(toEmail, 'Your Daily Pacing Digest', htmlBody);
  }

  async sendWeeklySummary(
    toEmail: string,
    formattedDate: string,
    insightText: string,
    tableHeadersHtml: string,
    tableRowsHtml: string,
    weeklyStats: WeeklyStats,
  ): Promise<void> {
    const htmlBody = buildWeeklySummaryTemplate(
      insightText,
      tableHeadersHtml,
      tableRowsHtml,
      weeklyStats,
    );

    await this.sendEmail(
      toEmail,
      `Weekly Pacing Report: Week Of ${formattedDate}`,
      htmlBody,
    );
  }

  private async sendEmail(
    to: string,
    subject: string,
    html: string,
  ): Promise<void> {
    if (!this.resendApiKey) {
      console.warn('Email bypassed: RESEND_API_KEY is not configured.');
      return;
    }

    const response = await fetch(`${this.baseUrl}/emails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.resendApiKey}`,
      },
      body: JSON.stringify({
        from: this.fromAddress,
        to,
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json();
      throw new DownstreamSyncError(
        `Failed to send email: ${JSON.stringify(errorBody)}`,
      );
    }
  }
}
