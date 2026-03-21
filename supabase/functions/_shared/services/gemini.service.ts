import {
  GoogleGenerativeAI,
  Schema,
  SchemaType,
} from 'npm:@google/generative-ai';
import { AI_CONFIG } from '../config.ts';

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

    // 3. Configure the model using the environment variable!
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
}
