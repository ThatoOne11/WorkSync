import { EmailTheme } from '../../_shared/constants/email.constants.ts';
import { ProjectAnalysis } from '../../_shared/types/app.types.ts';

export class PacingHelper {
  static buildProjectRows(projects: ProjectAnalysis[]): string {
    return projects
      .map((p) => {
        const isOver = p.variance > 0;
        const statusColor = isOver
          ? EmailTheme.WARNING_COLOR
          : EmailTheme.DANGER_COLOR;
        const statusLabel = isOver ? 'Overshooting' : 'Falling Behind';
        const varianceText =
          (p.variance > 0 ? '+' : '') + p.variance.toFixed(1);

        return `
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid ${EmailTheme.DIVIDER_COLOR};">
              <strong style="color: ${EmailTheme.PRIMARY_TEXT};">${p.name}</strong><br>
              <span style="color: ${statusColor}; font-size: 12px; font-weight: 700;">${statusLabel}</span>
            </td>
            <td style="padding: 12px 0; border-bottom: 1px solid ${EmailTheme.DIVIDER_COLOR}; text-align: right;">
              <strong style="color: ${statusColor}; font-size: 16px;">${varianceText} hrs</strong>
            </td>
          </tr>
        `;
      })
      .join('');
  }
}
