import {
  GoogleGenerativeAI,
  Schema,
  SchemaType,
} from 'npm:@google/generative-ai';
import { AI_CONFIG } from '../config.ts';
import { WeeklyStats, ProjectSummary } from '../types/app.types.ts';
import { EmailTheme } from '../constants/email.constants.ts';

export type ProjectVarianceContext = {
  name: string;
  loggedHours: number;
  targetHours: number;
  variance: number;
};

export class GeminiService {
  private ai: GoogleGenerativeAI;

  constructor() {
    if (!AI_CONFIG.geminiApiKey) {
      throw new Error('GEMINI_API_KEY is not configured in the environment.');
    }
    this.ai = new GoogleGenerativeAI(AI_CONFIG.geminiApiKey);
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
      model: AI_CONFIG.geminiModel as string,
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
      - If they are falling behind (undershooting), use <span style="color: ${EmailTheme.INFO_COLOR}; font-weight: 700;"> to highlight the variance.
      - If they are working too much (overshooting/burnout risk), use <span style="color: ${EmailTheme.DANGER_COLOR}; font-weight: 700;">.
      - If they are perfectly balanced, use <span style="color: ${EmailTheme.SUCCESS_COLOR}; font-weight: 700;">.
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
}
