import { EmailTheme } from '../constants/email.constants.ts';
import { ProjectAnalysis, ProjectSummary } from '../types/app.types.ts';
import { getWeekOfMonth } from '../utils/date.utils.ts';

export class EmailHelper {
  // PACING DIGEST HELPERS
  static buildPacingProjectRows(projects: ProjectAnalysis[]): string {
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

  // WEEKLY SUMMARY HELPERS
  static getStatusColor(
    status: 'On Pace' | 'Over Shooting' | 'Under Shooting',
  ): string {
    if (status === 'Over Shooting') return EmailTheme.DANGER_COLOR;
    if (status === 'Under Shooting') return EmailTheme.INFO_COLOR;
    return EmailTheme.SUCCESS_COLOR;
  }

  static buildWeeklyTableHeaders(
    weekNumber: number,
    isLastWeekOfMonth: boolean,
  ): string {
    if (isLastWeekOfMonth) {
      return `
        <th style="padding: 10px 20px; text-align: left; font-weight: 700;">Project</th>
        <th style="padding: 10px 20px; text-align: center; font-weight: 700;">Monthly Allocation (H)</th>
        <th style="padding: 10px 20px; text-align: center; font-weight: 700;">Total Logged (H)</th>
        <th style="padding: 10px 20px; text-align: right; font-weight: 700;">Final Balance</th>
      `;
    }

    let headers = `
      <th style="padding: 10px 20px; text-align: left; font-weight: 700;">Project</th>
      <th style="padding: 10px 20px; text-align: center; font-weight: 700;">Allocation (H)</th>
    `;

    for (let i = 1; i <= weekNumber; i++) {
      headers += `
        <th style="padding: 10px 20px; text-align: center; font-weight: 700;">W${i} Rec (H)</th>
        <th style="padding: 10px 20px; text-align: center; font-weight: 700;">W${i} Logged (H)</th>
      `;
    }

    headers +=
      '<th style="padding: 10px 20px; text-align: right; font-weight: 700;">Cumulative Balance</th>';

    return headers;
  }

  static buildWeeklyTableRows(
    summariesForEmail: ProjectSummary[],
    allMonthlyData: ProjectSummary[],
    weekNumber: number,
    isLastWeekOfMonth: boolean,
  ): string {
    // Scenario 1: It is the last week of the month (Simplified Table)
    if (isLastWeekOfMonth) {
      return summariesForEmail
        .map((s) => {
          const totalLogged = allMonthlyData
            .filter((d) => d.project_id === s.project_id)
            .reduce((acc, cur) => acc + cur.logged_hours, 0);

          const finalBalance = s.target_hours - totalLogged;
          const balanceColor =
            finalBalance >= 0
              ? EmailTheme.SUCCESS_COLOR
              : EmailTheme.DANGER_COLOR;

          return `
          <tr>
              <td style="padding: 14px 20px; font-weight: 500; border-bottom: 1px solid ${EmailTheme.DIVIDER_COLOR};">${s.project_name}</td>
              <td style="padding: 14px 20px; text-align: center; border-bottom: 1px solid ${EmailTheme.DIVIDER_COLOR};">${s.target_hours.toFixed(2)}</td>
              <td style="padding: 14px 20px; text-align: center; font-weight: 600; border-bottom: 1px solid ${EmailTheme.DIVIDER_COLOR};">${totalLogged.toFixed(2)}</td>
              <td style="padding: 14px 20px; text-align: right; font-weight: 700; color: ${balanceColor}; border-bottom: 1px solid ${EmailTheme.DIVIDER_COLOR};">${(finalBalance >= 0 ? '+' : '') + finalBalance.toFixed(2)}</td>
          </tr>
        `;
        })
        .join('');
    }

    // Scenario 2: Standard Mid-Month Week (Detailed Table mapped by Week)
    const projectData: Record<
      number,
      {
        name: string;
        target: number;
        weeks: Record<number, { rec: number; logged: number }>;
      }
    > = {};

    allMonthlyData.forEach((s) => {
      const wNum = getWeekOfMonth(new Date(s.week_ending_on));
      if (!projectData[s.project_id]) {
        projectData[s.project_id] = {
          name: s.project_name,
          target: s.target_hours,
          weeks: {},
        };
      }
      projectData[s.project_id].weeks[wNum] = {
        rec: s.recommended_hours || 0,
        logged: s.logged_hours,
      };
    });

    return Object.values(projectData)
      .map((p) => {
        let rowHtml = `<td style="padding: 14px 20px; font-weight: 500; border-bottom: 1px solid ${EmailTheme.DIVIDER_COLOR};">${p.name}</td>`;
        rowHtml += `<td style="padding: 14px 20px; text-align: center; border-bottom: 1px solid ${EmailTheme.DIVIDER_COLOR};">${p.target.toFixed(2)}</td>`;

        let cumulativeLogged = 0,
          cumulativeRec = 0;

        for (let i = 1; i <= weekNumber; i++) {
          const week = p.weeks[i];
          rowHtml += `<td style="padding: 14px 20px; text-align: center; border-bottom: 1px solid ${EmailTheme.DIVIDER_COLOR};">${week ? week.rec.toFixed(2) : '–'}</td>`;
          rowHtml += `<td style="padding: 14px 20px; text-align: center; font-weight: 600; border-bottom: 1px solid ${EmailTheme.DIVIDER_COLOR};">${week ? week.logged.toFixed(2) : '–'}</td>`;

          cumulativeLogged += week?.logged || 0;
          cumulativeRec += week?.rec || 0;
        }

        const cumulativeBalance = cumulativeRec - cumulativeLogged;
        const balanceColor =
          cumulativeBalance >= 0
            ? EmailTheme.SUCCESS_COLOR
            : EmailTheme.DANGER_COLOR;

        rowHtml += `<td style="padding: 14px 20px; text-align: right; font-weight: 700; color: ${balanceColor}; border-bottom: 1px solid ${EmailTheme.DIVIDER_COLOR};">${(cumulativeBalance >= 0 ? '+' : '') + cumulativeBalance.toFixed(2)}</td>`;

        return `<tr>${rowHtml}</tr>`;
      })
      .join('');
  }
}
