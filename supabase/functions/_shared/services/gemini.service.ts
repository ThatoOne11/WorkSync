import { GoogleGenAI, Schema } from 'npm:@google/genai';
import { ENV } from '../configs/env.ts';

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: ENV.GEMINI_API_KEY });
  }

  async generateStructuredContent<T>(
    prompt: string,
    schema: Schema,
    temperature = 0.7,
  ): Promise<T> {
    try {
      const response = await this.ai.models.generateContent({
        model: ENV.GEMINI_MODEL as string,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: schema,
          temperature: temperature,
        },
      });

      if (!response.text) {
        throw new Error('Model returned an empty response.');
      }

      return JSON.parse(response.text) as T;
    } catch (error) {
      console.error('Gemini Generation Error:', error);
      throw new Error('Failed to generate structured content from Gemini.');
    }
  }
}
