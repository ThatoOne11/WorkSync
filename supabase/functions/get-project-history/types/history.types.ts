import { z } from 'npm:zod';

export const GetProjectHistorySchema = z.object({
  projectId: z.number(),
  browserId: z.string().min(1),
});

export type GetProjectHistoryRequest = z.infer<typeof GetProjectHistorySchema>;

export type HistoryResponsePayload = {
  projectName: string;
  keyMetrics: {
    totalLoggedHours: number;
    targetHours: number;
    averageWeeklyBurn: number;
    pacingVariance: number;
    mostProductiveWeek: {
      logged_hours: number;
      week_ending_on: string;
    };
  };
  chartData: {
    labels: string[];
    datasets: unknown[];
  };
  monthlyChartData: {
    labels: string[];
    datasets: unknown[];
  };
  insights: string[];
};
