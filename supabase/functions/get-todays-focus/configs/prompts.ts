import { Schema, SchemaType } from 'npm:@google/generative-ai';

export const FocusAIConfig = {
  // Strict Schema mapped to our FocusProjectResult type
  schema: {
    type: SchemaType.ARRAY,
    items: {
      type: SchemaType.OBJECT,
      properties: {
        name: { type: SchemaType.STRING },
        requiredHoursToday: { type: SchemaType.NUMBER },
      },
      required: ['name', 'requiredHoursToday'],
    },
  } as Schema,

  // Prompt Builder
  buildPrompt: (
    baselineList: { name: string; baselineHours: number }[],
    dayOfWeek: string,
  ) => {
    return `
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
  },
};
