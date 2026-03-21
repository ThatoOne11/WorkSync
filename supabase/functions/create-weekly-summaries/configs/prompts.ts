import { Schema, Type } from 'npm:@google/genai';
import { EMAIL_THEME } from '../../_shared/constants/email.constants.ts';
import { WeeklyStats, ProjectSummary } from '../../_shared/types/app.types.ts';

export const SummariesAIConfig = {
  schema: {
    type: Type.OBJECT,
    properties: {
      insightHtml: { type: Type.STRING },
    },
    required: ['insightHtml'],
  } as Schema,

  buildPrompt: (weeklyStats: WeeklyStats, thisWeekData: ProjectSummary[]) => {
    return `
      You are an expert productivity coach. Write a short, encouraging, and analytical opening paragraph for a user's weekly time-tracking email report.

      Week Stats: ${JSON.stringify(weeklyStats)}
      Project Breakdown: ${JSON.stringify(thisWeekData)}

      Rules:
      - Keep it to 2-3 sentences max.
      - Mention their total logged hours (${weeklyStats.weeklyLoggedHours.toFixed(2)}) versus their recommended hours (${weeklyStats.recommendedWeeklyHours.toFixed(2)}).
      - Note their peak day (${weeklyStats.peakDay}) or top project if relevant.
      - Provide a quick pacing assessment (Are they over, under, or perfectly on track?).
      - ALWAYS use inline HTML for emphasis. Use <span style="font-weight: 700;"> for numbers. 
      - If they are falling behind (undershooting), use <span style="color: ${EMAIL_THEME.INFO_COLOR}; font-weight: 700;"> to highlight the variance.
      - If they are working too much (overshooting/burnout risk), use <span style="color: ${EMAIL_THEME.DANGER_COLOR}; font-weight: 700;">.
      - If they are perfectly balanced, use <span style="color: ${EMAIL_THEME.SUCCESS_COLOR}; font-weight: 700;">.
      - DO NOT wrap the output in markdown blocks (e.g., \`\`\`html). Just return the raw HTML string inside the JSON object.
    `;
  },
};
