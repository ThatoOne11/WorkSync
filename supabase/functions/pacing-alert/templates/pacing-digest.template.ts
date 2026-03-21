import { EMAIL_THEME } from '../../_shared/constants/email.constants.ts';

export function buildPacingDigestTemplate(projectRowsHtml: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <body style="margin: 0; padding: 0; background-color: ${EMAIL_THEME.BG_COLOR}; font-family: sans-serif;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: ${EMAIL_THEME.BG_COLOR}; padding: 20px;">
        <tr>
          <td align="center">
            <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: ${EMAIL_THEME.SURFACE_COLOR}; border-radius: 8px; padding: 30px;">
              <tr>
                <td>
                  <h1 style="color: ${EMAIL_THEME.BRAND_ACCENT}; font-size: 24px;">Your Daily Pacing Digest</h1>
                  <p style="color: ${EMAIL_THEME.SECONDARY_TEXT};">Here’s a look at projects that need your attention based on today's progress.</p>
                  
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 20px;">
                    ${projectRowsHtml}
                  </table>

                  <p style="color: ${EMAIL_THEME.SECONDARY_TEXT}; margin-top: 30px;">Use your <a href="https://worksync-f2s.pages.dev/dashboard" style="color: ${EMAIL_THEME.BRAND_ACCENT};">WorkSync Dashboard</a> for a more detailed breakdown.</p>
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
