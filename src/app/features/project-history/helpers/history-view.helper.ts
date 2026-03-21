import { HistoryPayload } from '../../../shared/schemas/app.schemas';

export type MonthlyTableRow = {
  month: string;
  target: number;
  logged: number;
  variance: number;
};

export class HistoryViewHelper {
  // Transforms raw Chart.js datasets from the backend payload into structured table rows.
  static extractTableRowsFromChartData(
    data: HistoryPayload | null,
  ): MonthlyTableRow[] {
    if (
      !data?.monthlyChartData?.labels ||
      !data.monthlyChartData.datasets[0] ||
      !data.monthlyChartData.datasets[1]
    ) {
      return [];
    }
    return data.monthlyChartData.labels.map((label: unknown, index: number) => {
      const loggedData = data.monthlyChartData.datasets[0].data[
        index
      ] as number;
      const targetData = data.monthlyChartData.datasets[1].data[
        index
      ] as number;

      return {
        month: String(label),
        target: targetData,
        logged: loggedData,
        variance: loggedData - targetData,
      };
    });
  }
}
