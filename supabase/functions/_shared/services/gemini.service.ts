import { GoogleGenerativeAI, Schema } from 'npm:@google/generative-ai';
import { ENV } from '../configs/env.ts';

export class GeminiService {
  private ai: GoogleGenerativeAI;

  constructor() {
    this.ai = new GoogleGenerativeAI(ENV.GEMINI_API_KEY);
  }

  // Generic method to generate structured JSON from Gemini.
  async generateStructuredContent<T>(
    prompt: string,
    schema: Schema,
    temperature = 0.7,
  ): Promise<T> {
    const model = this.ai.getGenerativeModel({
      model: ENV.GEMINI_MODEL as string,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: schema,
        temperature,
      },
    });

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      return JSON.parse(text) as T;
    } catch (error) {
      console.error('Gemini Generation Error:', error);
      throw new Error('Failed to generate structured content from Gemini.');
    }
  }
}
