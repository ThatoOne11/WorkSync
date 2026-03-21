import { EMAIL_THEME } from '../../_shared/constants/email.constants.ts';
import { WeeklyStats } from '../../_shared/types/app.types.ts';

export function buildWeeklySummaryTemplate(
  insightText: string,
  tableHeadersHtml: string,
  tableRowsHtml: string,
  weeklyStats: WeeklyStats,
): string {
  const getStatusColor = (status: string) => {
    if (status === 'Over Shooting') return EMAIL_THEME.DANGER_COLOR;
    if (status === 'Under Shooting') return EMAIL_THEME.INFO_COLOR;
    return EMAIL_THEME.SUCCESS_COLOR;
  };

  const statusColor = getStatusColor(weeklyStats.overallStatus);

  return `
    <!DOCTYPE html>
    <html lang="en">
    <body style="margin: 0; padding: 0; background-color: ${EMAIL_THEME.BG_COLOR}; font-family: 'Roboto', Arial, sans-serif;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: ${EMAIL_THEME.BG_COLOR};">
            <tr>
                <td align="center" style="padding: 30px 20px;">
                    <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: ${EMAIL_THEME.SURFACE_COLOR}; border-radius: 8px; padding: 30px;">
                        <tr>
                            <td>
                                <h1 style="color: ${EMAIL_THEME.BRAND_ACCENT}; font-size: 28px; margin-top: 0;">Your Weekly Pacing Report is Ready!</h1>
                                <p style="color: ${EMAIL_THEME.SECONDARY_TEXT}; font-size: 16px;">${insightText}</p>
                                
                                <p style="color: ${EMAIL_THEME.PRIMARY_TEXT}; font-size: 18px; font-weight: 700; margin-top: 15px;">
                                    Overall Monthly Status: <span style="color: ${statusColor};">${weeklyStats.overallStatus}</span>
                                </p>
                                
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse; margin-top: 20px;">
                                    <thead style="background-color: ${EMAIL_THEME.BG_COLOR}; color: ${EMAIL_THEME.SECONDARY_TEXT}; font-size: 11px; text-transform: uppercase;">
                                        <tr>${tableHeadersHtml}</tr>
                                    </thead>
                                    <tbody>${tableRowsHtml}</tbody>
                                </table>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
  `;
}
