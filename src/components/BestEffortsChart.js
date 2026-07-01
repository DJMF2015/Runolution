import React from 'react';
import styled from 'styled-components';
import {
  Chart as ChartJS,
  BarElement,
  BarController,
  LineController,
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
  BarController,
  LineController,
  LineElement,
  Tooltip,
  Legend,
  Filler,
);

const HEART_RATE_AREA_COLOR = 'rgba(220, 38, 38, 0.16)';
const HEART_RATE_BORDER_COLOR = '#111111';
const HEART_RATE_POINT_COLOR = '#dc2626';

const secondsToMinutes = (seconds) => {
  return Number((Number(seconds || 0) / 60).toFixed(2));
};

const secondsToTimeLabel = (seconds) => {
  const totalSeconds = Number(seconds || 0);
  const minutes = Math.floor(totalSeconds / 60);
  const remainder = Math.round(totalSeconds % 60);
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
};

const getPaceMinutesPerKm = (row) => {
  const distanceMetres = Number(row?.distance);
  const elapsedSeconds = Number(row?.elapsed_time);

  if (
    !Number.isFinite(distanceMetres) ||
    !Number.isFinite(elapsedSeconds) ||
    distanceMetres <= 0 ||
    elapsedSeconds <= 0
  ) {
    return null;
  }

  return Number((elapsedSeconds / (distanceMetres / 1000) / 60).toFixed(2));
};

const getPaceFromRow = (row) => {
  return getPaceMinutesPerKm(row);
};

const getStreamData = (streams, key) => {
  if (Array.isArray(streams)) {
    return streams.find((stream) => stream?.type === key)?.data || [];
  }

  if (Array.isArray(streams?.[key])) {
    return streams[key];
  }

  return streams?.[key]?.data || streams?.streams?.[key]?.data || [];
};

const sampleStreamToLength = (streamData, itemCount) => {
  if (!Array.isArray(streamData) || !streamData.length || !itemCount) {
    return [];
  }

  if (itemCount === 1) {
    return [streamData[0]];
  }

  const lastStreamIndex = streamData.length - 1;

  return Array.from({ length: itemCount }, (_, index) => {
    const streamIndex = Math.round((index / (itemCount - 1)) * lastStreamIndex);

    return streamData[streamIndex];
  });
};

const getStreamSampleValue = (streams, key, index, itemCount, formatter = Number) => {
  const samples = sampleStreamToLength(getStreamData(streams, key), itemCount);
  const value = formatter(samples[index]);

  return Number.isFinite(value) ? value : null;
};

const getSplitHeartRate = (streams, split, index, splitCount) => {
  return (
    getStreamSampleValue(streams, 'heartrate', index, splitCount, Math.round) ??
    (split?.average_heartrate ? Math.round(split.average_heartrate) : null)
  );
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

const getChartOptions = (paces, heartRates, velocities, hasHeartRate, hasVelocity) => {
  const paceRange = getAxisRange(paces, 6, 0.16);
  const heartRateRange = getAxisRange(heartRates, 180, 0.18);

  return {
    indexAxis: 'y',
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
            if (context.dataset.xAxisID === 'heartRate') {
              return `Heart rate: ${context.parsed.x || 0} bpm`;
            }
            return `Pace: ${secondsToTimeLabel((context.parsed.x || 0) * 60)} /km`;
          },
        },
      },
    },
    scales: {
      y: {
        type: 'category',
        position: 'left',
        ticks: {
          color: '#0b0b0b',
          autoSkip: true,
          maxTicksLimit: 10,
          font: {
            size: 11,
            weight: '700',
          },
        },
        grid: {
          display: false,
        },
      },
      pace: {
        type: 'linear',
        position: 'bottom',
        min: paceRange.min,
        suggestedMax: paceRange.max,
        ticks: {
          color: '#fc5200',
          maxTicksLimit: 6,
          callback: (value) => `${secondsToTimeLabel(Number(value) * 60)}`,
        },
        grid: {
          color: 'rgba(252, 82, 0, 0.13)',
        },
        title: {
          display: true,
          text: 'Pace /km',
          color: '#fc5200',
          font: {
            size: 12,
            weight: '800',
          },
        },
      },
      heartRate: {
        type: 'linear',
        position: 'top',
        display: hasHeartRate,
        min: heartRateRange.min,
        suggestedMax: heartRateRange.max,
        ticks: {
          color: HEART_RATE_BORDER_COLOR,
          maxTicksLimit: 5,
          callback: (value) => `${value}`,
        },
        grid: {
          drawOnChartArea: false,
        },
        title: {
          display: true,
          text: 'Heart rate (bpm)',
          color: HEART_RATE_BORDER_COLOR,
          font: {
            size: 12,
            weight: '800',
          },
        },
      },
    },
  };
};

const getMileSplits = (activity, streams) => {
  const splits = activity?.splits_standard || [];

  if (splits.length) {
    return splits.map((split, index) => ({
      label: `Mile ${split.split || index + 1}`,
      elapsedTime: secondsToMinutes(split.elapsed_time),
      pace: getPaceFromRow(split),
      heartRate: getSplitHeartRate(streams, split, index, splits.length),
    }));
  }

  const metricSplits = activity?.splits_metric || [];

  if (metricSplits.length) {
    return metricSplits.map((split, index) => ({
      label: `Km ${split.split || index + 1}`,
      elapsedTime: secondsToMinutes(split.elapsed_time),
      pace: getPaceFromRow(split),
      heartRate: getSplitHeartRate(streams, split, index, metricSplits.length),
    }));
  }

  const laps = activity?.laps || [];

  if (laps.length) {
    return laps.map((lap, index) => ({
      label: `Lap ${lap.split || index + 1}`,
      elapsedTime: secondsToMinutes(lap.elapsed_time),
      pace: getPaceFromRow(lap),
      heartRate: getSplitHeartRate(streams, lap, index, laps.length),
    }));
  }

  const bestEfforts = activity?.best_efforts || [];

  return bestEfforts.map((effort, index) => ({
    label: effort.name || `Mile ${index + 1}`,
    elapsedTime: secondsToMinutes(effort.elapsed_time),
    pace: getPaceFromRow(effort),
    heartRate: getSplitHeartRate(streams, effort, index, bestEfforts.length),
  }));
};

export default function BestEffortsChart({ props, streams }) {
  const mileSplits = getMileSplits(props, streams);

  if (!mileSplits.length) {
    return <EmptyChart>No mile split data available for this activity.</EmptyChart>;
  }

  const labels = mileSplits.map((split) => split.label);
  const paces = mileSplits.map((split) => split.pace);
  const heartRates = mileSplits.map((split) => split.heartRate);
  const velocities = mileSplits.map((split) => split.velocity);
  const hasPace = paces.some((pace) => Number.isFinite(pace));
  const hasHeartRate = heartRates.some((heartRate) => Number.isFinite(heartRate));
  const hasVelocity = velocities.some((velocity) => Number.isFinite(velocity));
  const options = getChartOptions(
    paces,
    heartRates,
    velocities,
    hasHeartRate,
    hasVelocity,
  );

  const data = {
    labels,
    datasets: [
      {
        label: 'Split pace (/km)',
        type: 'bar',
        data: paces,
        xAxisID: 'pace',
        yAxisID: 'y',
        borderColor: 'rgba(194, 65, 12, 0.9)',
        backgroundColor: 'rgba(252, 82, 0, 0.96)',
        hoverBackgroundColor: 'rgba(255, 106, 36, 1)',
        borderWidth: 1,
        borderRadius: 5,
        barPercentage: 0.7,
        categoryPercentage: 0.74,
        order: 1,
        hidden: !hasPace,
      },
      {
        label: 'Heart rate from stream (bpm)',
        type: 'line',
        data: heartRates,
        xAxisID: 'heartRate',
        yAxisID: 'y',
        borderColor: HEART_RATE_BORDER_COLOR,
        backgroundColor: HEART_RATE_AREA_COLOR,
        pointBackgroundColor: HEART_RATE_POINT_COLOR,
        pointBorderColor: HEART_RATE_BORDER_COLOR,
        pointBorderWidth: 2,
        pointHoverRadius: 6,
        pointRadius: 3.5,
        tension: 0.38,
        borderWidth: 2,
        fill: 'origin',
        order: 2,
        spanGaps: true,
        hidden: !hasHeartRate,
      },
    ],
  };

  return (
    <ChartPanel>
      <ChartHeader>
        <ChartTitle>Mile Splits</ChartTitle>
        <ChartSubtitle>Pace by split with heart rate and velocity overlays</ChartSubtitle>
      </ChartHeader>
      <ChartWrapper $rowCount={mileSplits.length}>
        <Chart
          type="bar"
          data={data}
          options={options}
          role="img"
          aria-label="Mile splits chart showing split pace, heart rate and velocity"
        />
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
  border-radius: 12px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(246, 247, 249, 0.96)),
    radial-gradient(circle at top right, rgba(252, 82, 0, 0.14), transparent 34%);
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.18);

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
  color: #111827;
  font-size: 1rem;
  line-height: 1.2;
`;

const ChartSubtitle = styled.p`
  margin: 0.25rem 0 0;
  color: #4b5563;
  font-size: 0.82rem;
  line-height: 1.35;
`;

const ChartWrapper = styled.div`
  width: 100%;
  max-width: 100%;
  height: ${({ $rowCount }) =>
    `${Math.min(Math.max(Number($rowCount || 0) * 42 + 150, 340), 680)}px`};
  min-width: 0;
  position: relative;
  overflow: hidden;

  canvas {
    max-width: 100%;
  }

  @media screen and (max-width: 700px) {
    height: ${({ $rowCount }) =>
      `${Math.min(Math.max(Number($rowCount || 0) * 38 + 145, 320), 620)}px`};
  }

  @media screen and (max-width: 420px) {
    height: ${({ $rowCount }) =>
      `${Math.min(Math.max(Number($rowCount || 0) * 36 + 140, 320), 580)}px`};
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
