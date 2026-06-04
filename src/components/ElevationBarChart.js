import React from 'react';
import styled from 'styled-components';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
);

const METRES_PER_KM = 1000;
const METRES_PER_MILE = 1609.344;

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const secondsToPace = (seconds) => {
  const totalSeconds = Math.round(toNumber(seconds));
  const minutes = Math.floor(totalSeconds / 60);
  const remainder = totalSeconds % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
};

const formatPace = (paceMinutes) => secondsToPace(paceMinutes * 60);

const getAxisRange = (values, fallbackMax, paddingRatio = 0.16) => {
  const numericValues = values.filter((value) => Number.isFinite(value));

  if (!numericValues.length) {
    return {
      min: 0,
      max: fallbackMax,
    };
  }

  const minValue = Math.min(...numericValues);
  const maxValue = Math.max(...numericValues);
  const spread = Math.max(maxValue - minValue, Math.abs(maxValue) * 0.1, 1);
  const padding = spread * paddingRatio;

  return {
    min: Math.floor(Math.min(0, minValue - padding)),
    max: Math.ceil(maxValue + padding),
  };
};

const getSplitSource = (activity) => {
  if (activity?.splits_standard?.length) {
    return {
      unitLabel: 'Mile',
      unitDistance: METRES_PER_MILE,
      rows: activity.splits_standard,
    };
  }

  if (activity?.splits_metric?.length) {
    return {
      unitLabel: 'Km',
      unitDistance: METRES_PER_KM,
      rows: activity.splits_metric,
    };
  }

  return {
    unitLabel: 'Lap',
    unitDistance: null,
    rows: activity?.laps || [],
  };
};

const getPaceMinutesPerKm = (row) => {
  const distanceKm = toNumber(row.distance) / METRES_PER_KM;

  if (!distanceKm) {
    return null;
  }

  return toNumber(row.elapsed_time) / 60 / distanceKm;
};

const getAverage = (values, fallback = null) => {
  const numericValues = values.filter((value) => Number.isFinite(value));

  if (!numericValues.length) {
    return fallback;
  }

  return numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length;
};

const getGradeAdjustedSplits = (activity) => {
  const { unitLabel, unitDistance, rows } = getSplitSource(activity);
  const splitRows = rows.filter((row) => toNumber(row.distance) > 0 && row.elapsed_time);
  const paces = splitRows.map(getPaceMinutesPerKm);
  const heartRates = splitRows.map((row) => toNumber(row.average_heartrate, null));
  const avgPace = getAverage(paces);
  const avgHeartRate = getAverage(heartRates);

  if (!splitRows.length || !avgPace) {
    return [];
  }

  return splitRows.map((row, index) => {
    const distance = toNumber(row.distance, unitDistance || METRES_PER_KM);
    const distanceKm = distance / METRES_PER_KM;
    const pace = getPaceMinutesPerKm(row);
    const heartRate = toNumber(row.average_heartrate, null);
    const elevation = toNumber(row.elevation_difference || row.total_elevation_gain);
    const climbingPerKm = distanceKm ? Math.max(elevation, 0) / distanceKm : 0;
    const paceScore = pace ? avgPace / pace : 1;
    const heartRateScore = heartRate && avgHeartRate ? heartRate / avgHeartRate : 1;
    const elevationScore = 1 + climbingPerKm / 100;
    const gradeAdjustedScore = Number(
      (paceScore * heartRateScore * elevationScore * 100).toFixed(1),
    );

    return {
      label: `${unitLabel} ${row.split || index + 1}`,
      elevation,
      climbingPerKm,
      pace,
      gradeAdjustedScore,
      heartRate,
    };
  });
};

const getChartOptions = (elevationValues, gradeAdjustedScores) => {
  const elevationRange = getAxisRange(elevationValues, 50, 0.2);
  const effortRange = getAxisRange(gradeAdjustedScores, 120, 0.18);

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
          color: '#0b0b0b',
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
          afterBody: (items) => {
            const index = items[0]?.dataIndex;
            const raw = items[0]?.chart?.data?.datasets?.[0]?.meta?.[index];

            if (!raw) {
              return [];
            }

            return [
              `Pace: ${formatPace(raw.pace)} /km`,
              `Climb: ${raw.climbingPerKm.toFixed(1)} m/km`,
              raw.heartRate ? `Avg HR: ${Math.round(raw.heartRate)} bpm` : '',
            ].filter(Boolean);
          },
          label: (context) => {
            if (context.dataset.yAxisID === 'effort') {
              return `Grade adjusted effort: ${context.parsed.y}`;
            }
            return `Elevation: ${context.parsed.y} m`;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: '#080808',
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
      elevation: {
        type: 'linear',
        position: 'left',
        min: elevationRange.min,
        suggestedMax: elevationRange.max,
        ticks: {
          color: '#000000',
          maxTicksLimit: 6,
          callback: (value) => `${value}m`,
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.18)',
        },
        title: {
          display: true,
          text: 'Elevation change',
          color: '#000000',
          font: {
            size: 12,
            weight: '800',
          },
        },
      },
      effort: {
        type: 'linear',
        position: 'right',
        min: Math.max(0, effortRange.min),
        suggestedMax: effortRange.max,
        ticks: {
          color: '#000000',
          maxTicksLimit: 6,
          callback: (value) => `${value}`,
        },
        grid: {
          drawOnChartArea: false,
        },
        title: {
          display: true,
          text: 'Grade adjusted effort',
          color: '#000000',
          font: {
            size: 12,
            weight: '800',
          },
        },
      },
    },
  };
};

export default function ElevationBarChart({ props }) {
  const splitData = getGradeAdjustedSplits(props || {});

  if (!splitData.length) {
    return <EmptyChart>No split elevation data available for this activity.</EmptyChart>;
  }

  const labels = splitData.map((split) => split.label);
  const elevationValues = splitData.map((split) => split.elevation);
  const gradeAdjustedScores = splitData.map((split) => split.gradeAdjustedScore);
  const options = getChartOptions(elevationValues, gradeAdjustedScores);

  const data = {
    labels,
    datasets: [
      {
        label: 'Elevation change',
        data: elevationValues,
        meta: splitData,
        fill: 'origin',
        borderColor: '#22c55e',
        backgroundColor: 'rgba(17, 17, 17, 0.18)',
        pointBackgroundColor: '#dcfce7',
        pointBorderColor: '#15803d',
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.35,
        borderWidth: 3,
        yAxisID: 'elevation',
      },
      {
        label: 'Grade adjusted effort',
        data: gradeAdjustedScores,
        fill: false,
        borderColor: '#fb923c',
        backgroundColor: '#fb923c',
        pointBackgroundColor: '#ffedd5',
        pointBorderColor: '#c2410c',
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.32,
        borderWidth: 3,
        yAxisID: 'effort',
      },
    ],
  };

  return (
    <ChartPanel>
      <ChartHeader>
        <ChartTitle>Elevation & Grade Adjusted Pace</ChartTitle>
        <ChartSubtitle>
          Elevation is shaded; effort adjusts pace by heart rate and climbing per
          kilometre.
        </ChartSubtitle>
      </ChartHeader>
      <ChartWrapper>
        <Line data={data} options={options} />
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
  color: #000000;
  font-size: 1rem;
  line-height: 1.2;
`;

const ChartSubtitle = styled.p`
  margin: 0.25rem 0 0;
  color: #000000;
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
  color: #000000;
  background: rgba(15, 23, 42, 0.94);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 14px;

  @media screen and (max-width: 700px) {
    height: 250px;
  }
`;
