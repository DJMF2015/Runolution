import React from 'react';
import styled from 'styled-components';
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';

ChartJS.register(
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
);

const secondsToMinutes = (seconds) => {
  return Number((Number(seconds || 0) / 60).toFixed(2));
};

const secondsToPaceLabel = (seconds) => {
  const totalSeconds = Number(seconds || 0);
  const minutes = Math.floor(totalSeconds / 60);
  const remainder = Math.round(totalSeconds % 60);
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
};

const getAxisRange = (values, fallbackMax, paddingRatio = 0.12) => {
  const numericValues = values.filter((value) => Number.isFinite(value));

  if (!numericValues.length) {
    return {
      min: 0,
      max: fallbackMax,
    };
  }

  const minValue = Math.min(...numericValues);
  const maxValue = Math.max(...numericValues);
  const spread = Math.max(maxValue - minValue, maxValue * 0.08, 1);
  const padding = spread * paddingRatio;

  return {
    min: Math.max(0, Math.floor(minValue - padding)),
    max: Math.ceil(maxValue + padding),
  };
};

const getChartOptions = (elapsedTimes, heartRates) => {
  const elapsedRange = getAxisRange(elapsedTimes, 10, 0.18);
  const heartRateRange = getAxisRange(heartRates, 180, 0.2);

  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#0f0f0f',
          boxWidth: 12,
          usePointStyle: true,
          padding: 14,
          font: {
            size: 12,
            weight: '700',
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.96)',
        borderColor: 'rgba(252, 82, 0, 0.45)',
        borderWidth: 1,
        titleColor: '#ffffff',
        bodyColor: '#e5e7eb',
        padding: 12,
        displayColors: true,
        callbacks: {
          label: (context) => {
            if (context.dataset.yAxisID === 'heartRate') {
              return `Avg HR: ${context.parsed.y || 0} bpm`;
            }
            return `Elapsed: ${secondsToPaceLabel((context.parsed.y || 0) * 60)}`;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: '#0b0b0b',
          autoSkip: true,
          maxRotation: 0,
          minRotation: 0,
          maxTicksLimit: 8,
          font: {
            size: 11,
            weight: '700',
          },
        },
        grid: {
          display: false,
        },
      },
      elapsed: {
        type: 'linear',
        position: 'left',
        beginAtZero: true,
        min: 0,
        suggestedMax: elapsedRange.max,
        ticks: {
          color: '#020202',
          maxTicksLimit: 6,
          callback: (value) => `${value}m`,
        },
        grid: {
          color: 'rgba(6, 6, 6, 0.18)',
        },
        title: {
          display: true,
          text: 'Elapsed time',
          color: '#060606',
          font: {
            size: 14,
            weight: '800',
          },
        },
      },
      heartRate: {
        type: 'linear',
        position: 'right',
        min: heartRateRange.min,
        suggestedMax: heartRateRange.max,
        ticks: {
          color: '#141414',
          maxTicksLimit: 6,
          callback: (value) => `${value}`,
        },
        grid: {
          drawOnChartArea: false,
        },
        title: {
          display: true,
          text: 'Avg heart rate',
          color: '#040404',
          font: {
            size: 14,
            weight: '800',
          },
        },
      },
    },
  };
};

const getMileSplits = (activity) => {
  const splits = activity?.splits_standard || [];

  if (splits.length) {
    return splits.map((split, index) => ({
      label: `Mile ${split.split || index + 1}`,
      elapsedTime: secondsToMinutes(split.elapsed_time),
      heartRate: split.average_heartrate ? Math.round(split.average_heartrate) : null,
    }));
  }

  const bestEfforts = activity?.best_efforts || [];

  return bestEfforts.map((effort, index) => ({
    label: effort.name || `Mile ${index + 1}`,
    elapsedTime: secondsToMinutes(effort.elapsed_time),
    heartRate: effort.average_heartrate ? Math.round(effort.average_heartrate) : null,
  }));
};

export default function BestEffortsChart({ props }) {
  const mileSplits = getMileSplits(props);

  if (!mileSplits.length) {
    return <EmptyChart>No mile split data available for this activity.</EmptyChart>;
  }

  const labels = mileSplits.map((split) => split.label);
  const elapsedTimes = mileSplits.map((split) => split.elapsedTime);
  const heartRates = mileSplits.map((split) => split.heartRate);
  const hasHeartRate = heartRates.some((heartRate) => Number.isFinite(heartRate));
  const options = getChartOptions(elapsedTimes, heartRates);

  const data = {
    labels,
    datasets: [
      {
        label: 'Elapsed Time (mins)',
        type: 'bar',
        data: elapsedTimes,
        yAxisID: 'elapsed',
        borderColor: '#141414',
        backgroundColor: 'rgba(252, 82, 0, 0.68)',
        borderWidth: 1,
        borderRadius: 7,
        barPercentage: 0.72,
        categoryPercentage: 0.72,
      },
      {
        label: 'Average Heart Rate (bpm)',
        type: 'line',
        data: heartRates,
        yAxisID: 'heartRate',
        borderColor: '#60a5fa',
        backgroundColor: '#60a5fa',
        pointBackgroundColor: '#dbeafe',
        pointBorderColor: '#1d4ed8',
        pointHoverRadius: 6,
        pointRadius: 4,
        tension: 0.32,
        borderWidth: 3,
        spanGaps: true,
        hidden: !hasHeartRate,
      },
    ],
  };

  return (
    <ChartPanel>
      <ChartHeader>
        <ChartTitle>Mile Splits</ChartTitle>
        <ChartSubtitle>
          Elapsed time per mile with average heart rate overlay
        </ChartSubtitle>
      </ChartHeader>
      <ChartWrapper>
        <Chart type="bar" data={data} options={options} />
      </ChartWrapper>
    </ChartPanel>
  );
}

const ChartPanel = styled.div`
  width: 100%;
  max-width: 100%;
  min-width: 0;
  padding: 1rem;
  box-sizing: border-box;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 14px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(228, 232, 237, 0.94)),
    radial-gradient(circle at top right, rgba(252, 82, 0, 0.22), transparent 36%);
  box-shadow: 0 16px 38px rgba(0, 0, 0, 0.24);

  @media screen and (max-width: 700px) {
    padding: 0.85rem;
    border-radius: 12px;
  }
`;

const ChartHeader = styled.div`
  margin-bottom: 0.85rem;
`;

const ChartTitle = styled.h3`
  margin: 0;
  color: black;
  font-size: 1rem;
  line-height: 1.2;
`;

const ChartSubtitle = styled.p`
  margin: 0.25rem 0 0;
  color: #080808;
  font-size: 0.82rem;
  line-height: 1.35;
`;

const ChartWrapper = styled.div`
  width: 100%;
  max-width: 100%;
  height: 340px;
  min-width: 0;
  position: relative;
  overflow: hidden;

  canvas {
    max-width: 100%;
  }

  @media screen and (max-width: 700px) {
    height: 310px;
  }

  @media screen and (max-width: 420px) {
    height: 285px;
  }
`;

const EmptyChart = styled.div`
  width: 100%;
  max-width: 100%;
  height: 300px;
  display: grid;
  place-items: center;
  padding: 1rem;
  box-sizing: border-box;
  text-align: center;
  color: #020202;
  background: rgba(15, 23, 42, 0.94);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 14px;

  @media screen and (max-width: 700px) {
    height: 250px;
  }
`;
