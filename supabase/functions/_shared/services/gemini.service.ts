import {
  GoogleGenerativeAI,
  Schema,
  SchemaType,
} from 'npm:@google/generative-ai';
import { AI_CONFIG } from '../config.ts';
import { WeeklyStats, ProjectSummary } from '../types/app.types.ts';
import { ENV } from '../configs/env.ts';
import { EMAIL_THEME } from '../constants/email.constants.ts';

export type ProjectVarianceContext = {
  name: string;
  loggedHours: number;
  targetHours: number;
  variance: number;
};

export class GeminiService {
  private ai: GoogleGenerativeAI;

  constructor() {
    this.ai = new GoogleGenerativeAI(ENV.GEMINI_API_KEY);
  }

  async generatePacingSuggestions(
    projectsData: ProjectVarianceContext[],
    isWeekend: boolean,
  ): Promise<string[]> {
    const responseSchema: Schema = {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    };

    const model = this.ai.getGenerativeModel({
      model: ENV.GEMINI_MODEL as string,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema,
        temperature: 0.7,
      },
    });

    const dayContext = isWeekend
      ? 'It is the weekend. Provide a review of their week.'
      : 'It is a weekday. Provide actionable pacing advice for the rest of the week/month.';

    const prompt = `
      You are an expert productivity and pacing coach for freelancers and teams.
      Analyze the following project data and provide 1 to 3 short, punchy, actionable insights.
      
      Context: ${dayContext}
      Project Data: ${JSON.stringify(projectsData)}
      
      Rules:
      - Use HTML formatting (like <strong>) to highlight project names or key numbers.
      - If a project variance is positive, they are OVERSHOOTING their target (working too much).
      - If a project variance is negative, they are UNDERSHOOTING their target (falling behind).
      - Keep the tone professional, slightly conversational, and extremely concise.
    `;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      return JSON.parse(text) as string[];
    } catch (error) {
      console.error('Gemini Generation Error:', error);
      return [
        'AI analysis is temporarily unavailable, but keep up the great work!',
      ];
    }
  }

  async generateWeeklySummaryInsight(
    weeklyStats: WeeklyStats,
    thisWeekData: ProjectSummary[],
  ): Promise<string> {
    const responseSchema: Schema = {
      type: SchemaType.OBJECT,
      properties: {
        insightHtml: { type: SchemaType.STRING },
      },
      required: ['insightHtml'],
    };

    const model = this.ai.getGenerativeModel({
      model: AI_CONFIG.geminiModel as string,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema,
        temperature: 0.7,
      },
    });

    //Give it the stats and strict formatting rules based on your EmailTheme
    const prompt = `
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

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const parsed = JSON.parse(text) as { insightHtml: string };
      return parsed.insightHtml;
    } catch (error) {
      console.error('Gemini Generation Error:', error);
      // Bulletproof fallback so the email still sends even if the AI times out
      return `You logged <span style="font-weight: 700;">${weeklyStats.weeklyLoggedHours.toFixed(2)} hours</span> this week. Keep up the great work keeping your projects synced!`;
    }
  }

  async optimizeDailyFocus(
    baselineList: { name: string; baselineHours: number }[],
    dayOfWeek: string,
  ): Promise<{ name: string; requiredHoursToday: number }[]> {
    // 1. Force a strict array of objects so it maps perfectly to our frontend FocusProjectResult
    const responseSchema: Schema = {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          requiredHoursToday: { type: SchemaType.NUMBER },
        },
        required: ['name', 'requiredHoursToday'],
      },
    };

    const model = this.ai.getGenerativeModel({
      model: AI_CONFIG.geminiModel as string,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema,
        temperature: 0.5, // Lower temperature so it stays mathematically grounded
      },
    });

    // 2. The Prompt: Teach it how to act like a pacing coach
    const prompt = `
      You are an AI productivity coach. Below is a user's mathematical baseline for hours they need to log today to stay perfectly on track for the month.
      Today is ${dayOfWeek}. 
      
      Your job is to adjust the "requiredHoursToday" slightly based on typical human productivity curves:
      - Mondays are for ramping up (slightly lower).
      - Tuesdays and Wednesdays are for deep work (slightly higher).
      - Thursdays are steady (baseline).
      - Fridays are for winding down (lower, but realistic if they are behind).

      Rules:
      - Adjust the numbers by no more than +/- 15%. 
      - If the baseline is very high (e.g., > 6 hours for one project), leave it as is or slightly reduce it to prevent burnout.
      - Return the numbers rounded to 1 decimal place.
      - DO NOT change the project names.

      Baseline Data: ${JSON.stringify(baselineList)}
    `;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      return JSON.parse(text) as { name: string; requiredHoursToday: number }[];
    } catch (error) {
      console.error('Gemini Generation Error:', error);
      // Fallback: If AI fails, just return the baseline data mapped to the correct keys
      return baselineList.map((b) => ({
        name: b.name,
        requiredHoursToday: b.baselineHours,
      }));
    }
  }
}
