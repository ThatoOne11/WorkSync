import { Schema, SchemaType } from 'npm:@google/generative-ai';
import { ProjectVarianceContext } from '../types/suggestions.types.ts';

export const SuggestionsAIConfig = {
  schema: {
    type: SchemaType.ARRAY,
    items: { type: SchemaType.STRING },
  } as Schema,

  buildPrompt: (projectsData: ProjectVarianceContext[], isWeekend: boolean) => {
    const dayContext = isWeekend
      ? 'It is the weekend. Provide a review of their week.'
      : 'It is a weekday. Provide actionable pacing advice for the rest of the week/month.';

    return `
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
  },
};
