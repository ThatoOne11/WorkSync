import { ENV } from '../configs/env.ts';
import { DownstreamSyncError } from '../exceptions/custom.exceptions.ts';
import { ApiConstants } from '../constants/api.constants.ts';

export class EmailService {
  private readonly resendApiKey = ENV.RESEND_API_KEY;
  private readonly fromAddress = 'WorkSync <onboarding@resend.dev>';
  private readonly baseUrl = ApiConstants.RESEND_BASE_URL;

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
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
