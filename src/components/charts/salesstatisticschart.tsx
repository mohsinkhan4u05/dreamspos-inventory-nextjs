"use client";

import dynamic from "next/dynamic";

export interface SalesStatisticsChartProps {
  categories: string[];
  salesSeries: number[];
  purchaseSeries: number[];
}

const ApexChartWrapper = dynamic<SalesStatisticsChartProps>(
  () => import("./apexwrapperschart/apexSalesStatisticschartwrapper"),
  { ssr: false },
);

export default function SalesStatisticsChart(props: SalesStatisticsChartProps) {
  return <ApexChartWrapper {...props} />;
}