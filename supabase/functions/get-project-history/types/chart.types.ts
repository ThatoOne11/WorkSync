export type ChartDataset = {
  label: string;
  data: number[];
  backgroundColor?: string;
  borderColor: string;
  borderWidth?: number;
  borderDash?: number[];
  fill?: boolean;
  tension?: number;
};

export type ChartData = {
  labels: string[];
  datasets: ChartDataset[];
};

export type HistoryChartsResult = {
  monthlyChartData: ChartData;
  chartData: ChartData;
};
