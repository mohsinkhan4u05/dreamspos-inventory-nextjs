'use client';

import React, { useEffect, useRef } from 'react';
import ApexCharts from 'apexcharts';

interface SalesStatisticsChartProps {
  categories: string[];
  salesSeries: number[];
  purchaseSeries: number[];
}

const ApexSalesStatisChartWrapper: React.FC<SalesStatisticsChartProps> = ({
  categories,
  salesSeries,
  purchaseSeries,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    const hasData =
      (salesSeries && salesSeries.length > 0) ||
      (purchaseSeries && purchaseSeries.length > 0);

    const rawSales = hasData ? salesSeries : new Array(12).fill(0);
    const rawPurchase = hasData ? purchaseSeries : new Array(12).fill(0);

    const allValues = [...rawSales, ...rawPurchase];
    const maxVal = allValues.reduce(
      (max, v) => (Math.abs(v) > max ? Math.abs(v) : max),
      0,
    );

    let divisor = 1;
    let unit = '';

    if (maxVal >= 1e7) {
      divisor = 1e7; // Crores
      unit = ' Cr';
    } else if (maxVal >= 1e5) {
      divisor = 1e5; // Lakhs
      unit = ' L';
    } else if (maxVal >= 1e3) {
      divisor = 1e3; // Thousands
      unit = ' K';
    }

    const scaledSales = rawSales.map((v) => v / divisor);
    const scaledPurchase = rawPurchase.map((v) => v / divisor);

    const series: ApexCharts.ApexOptions['series'] = [
      { name: 'Sales', data: scaledSales },
      { name: 'Purchase', data: scaledPurchase },
    ];

    const options: ApexCharts.ApexOptions = {
      series,
      grid: {
        padding: {
          top: 5,
          right: 5,
        },
      },
      colors: ['#0E9384', '#E04F16'],
      chart: {
        type: 'bar',
        height: 290,
        stacked: true,
        zoom: {
          enabled: true,
        },
      },
      responsive: [
        {
          breakpoint: 280,
          options: {
            legend: {
              position: 'bottom',
              offsetY: 0,
            },
          },
        },
      ],
      plotOptions: {
        bar: {
          horizontal: false,
          borderRadius: 4,
          borderRadiusApplication: 'around',
          borderRadiusWhenStacked: 'all',
          columnWidth: '20%',
        },
      },
      dataLabels: {
        enabled: false,
      },
      yaxis: {
        labels: {
          offsetX: -15,
          formatter: (val) => {
            const decimals = divisor === 1 ? 0 : 1;
            return `₹${Number(val).toFixed(decimals)}${unit}`;
          },
        },
      },
      xaxis: {
        categories:
          categories && categories.length > 0
            ? categories
            : [
                'Jan',
                'Feb',
                'Mar',
                'Apr',
                'May',
                'Jun',
                'Jul',
                'Aug',
                'Sep',
                'Oct',
                'Nov',
                'Dec',
              ],
      },
      legend: { show: false },
      fill: {
        opacity: 1,
      },
    };

    const chart = new ApexCharts(chartRef.current, options);
    chart.render();

    return () => {
      chart.destroy();
    };
  }, [categories, salesSeries, purchaseSeries]);

  return <div id="sales-statistics" ref={chartRef}></div>;
};

export default ApexSalesStatisChartWrapper;