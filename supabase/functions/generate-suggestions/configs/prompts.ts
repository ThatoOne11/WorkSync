import { Schema, SchemaType } from 'npm:@google/generative-ai';
import { ProjectVarianceContext } from '../types/suggestions.types.ts';

export const SuggestionsAIConfig = {
  schema: {
    type: SchemaType.ARRAY,
    items: { type: SchemaType.STRING },
  } as Schema,

  buildPrompt: (projectsData: ProjectVarianceContext[], isWeekend: boolean) => {
    const dayContext = isWeekend
      ? 'It is the weekend. Provide a brief review of their week.'
      : 'It is a weekday. Provide a quick pacing overview for the active projects.';

    return `
      You are a friendly, encouraging productivity coach for freelancers.
      Analyze the following project data and provide EXACTLY ONE string formatted as HTML.
      
      Context: ${dayContext}
      Project Data: ${JSON.stringify(projectsData)}
      
      Formatting Rules:
      - Return EXACTLY ONE string inside the JSON array. Do not return multiple items.
      - Start with a brief, encouraging opening sentence (1 line).
      - Follow it immediately with an HTML unordered list (<ul><li>...</li></ul>) breaking down the projects.
      - Keep each bullet point to a single, concise sentence.
      - Wrap project names in <strong> tags.
      - If a variance is positive, they are overshooting (working too much). If negative, they are falling behind.
      - Tone MUST be supportive, light, and easy to read. Do not use dramatic words like "significant imbalance" or "neglected."
    `;
  },
};
