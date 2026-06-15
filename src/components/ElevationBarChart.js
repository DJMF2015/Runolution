import React from 'react';
import styled from 'styled-components';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
);

const METRES_PER_KM = 1000;
const MAX_PROFILE_POINTS = 260;
const EFFORT_BASELINE = 100;
const EFFORT_WEIGHTS = {
  elevation: 0.4,
  heartRate: 0.35,
  velocity: 0.25,
};

const toNumber = (value, fallback = null) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const clamp = (value, min, max) => {
  return Math.min(Math.max(value, min), max);
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

const getAverage = (values) => {
  const numericValues = values.filter((value) => Number.isFinite(value));

  if (!numericValues.length) {
    return null;
  }

  return numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length;
};

const getAxisRange = (values, fallbackMax = 100) => {
  const numericValues = values.filter((value) => Number.isFinite(value));

  if (!numericValues.length) {
    return {
      min: 0,
      max: fallbackMax,
    };
  }

  const minValue = Math.min(...numericValues);
  const maxValue = Math.max(...numericValues);
  const spread = Math.max(maxValue - minValue, 10);
  const padding = spread * 0.12;

  return {
    min: Math.floor(minValue - padding),
    max: Math.ceil(maxValue + padding),
  };
};

/**
 * Effort is calculated from a weighted formula: - elevation/climb load: 40%, - heart-rate load: 35%, - velocity strain: 25%
 * @param {number} grade point
 * @returns number
 */
const getGradeAdjustedEffort = ({
  averageHeartRate,
  averageVelocity,
  distanceDeltaMetres,
  elevationDifference,
  heartRate,
  velocity,
}) => {
  const positiveGradePercent =
    (Math.max(elevationDifference, 0) / Math.max(distanceDeltaMetres, 1)) * 100;
  const elevationLoad = clamp(1 + positiveGradePercent / 10, 0.75, 2);
  const heartRateLoad =
    heartRate && averageHeartRate ? clamp(heartRate / averageHeartRate, 0.75, 1.5) : 1;
  const velocityLoad =
    velocity && averageVelocity ? clamp(averageVelocity / velocity, 0.75, 1.5) : 1;
  const weightedLoad =
    elevationLoad * EFFORT_WEIGHTS.elevation +
    heartRateLoad * EFFORT_WEIGHTS.heartRate +
    velocityLoad * EFFORT_WEIGHTS.velocity;

  return Number((EFFORT_BASELINE * weightedLoad).toFixed(1));
};

const getProfilePoints = (streams) => {
  const altitudeStream = getStreamData(streams, 'altitude');
  const distanceStream = getStreamData(streams, 'distance');
  const heartRateStream = getStreamData(streams, 'heartrate');
  const velocityStream = getStreamData(streams, 'velocity_smooth');
  const sampleStep = Math.max(1, Math.ceil(altitudeStream.length / MAX_PROFILE_POINTS));
  const averageHeartRate = getAverage(heartRateStream.map((value) => toNumber(value)));
  const averageVelocity = getAverage(velocityStream.map((value) => toNumber(value)));
  const points = [];

  altitudeStream.forEach((altitude, index) => {
    if (index % sampleStep !== 0 && index !== altitudeStream.length - 1) {
      return;
    }

    const altitudeMetres = toNumber(altitude);

    if (altitudeMetres === null) {
      return;
    }

    const previousPoint = points[points.length - 1];
    const distanceMetres = toNumber(distanceStream[index]);
    const distanceKm =
      distanceMetres !== null ? distanceMetres / METRES_PER_KM : index / sampleStep;
    const elevationDifference = previousPoint
      ? altitudeMetres - previousPoint.altitude
      : 0;
    const distanceDeltaMetres = previousPoint
      ? Math.max((distanceKm - previousPoint.distanceKm) * METRES_PER_KM, 1)
      : 1;
    const heartRate = toNumber(heartRateStream[index]);
    const velocity = toNumber(velocityStream[index]);

    points.push({
      altitude: altitudeMetres,
      distanceKm,
      elevationDifference,
      gradeAdjustedEffort: getGradeAdjustedEffort({
        averageHeartRate,
        averageVelocity,
        distanceDeltaMetres,
        elevationDifference,
        heartRate,
        velocity,
      }),
      heartRate,
      velocity,
    });
  });

  return points;
};

const formatDistance = (distanceKm) => {
  return `${Number(distanceKm || 0).toFixed(2)} km`;
};

const getChartOptions = (profilePoints) => {
  const elevationRange = getAxisRange(
    profilePoints.map((point) => point.elevationDifference),
    50,
  );
  const effortRange = getAxisRange(
    profilePoints.map((point) => point.gradeAdjustedEffort),
    120,
  );

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
          title: (items) => {
            const point = profilePoints[items[0]?.dataIndex];
            return point ? formatDistance(point.distanceKm) : '';
          },
          afterBody: (items) => {
            const point = profilePoints[items[0]?.dataIndex];

            if (!point) {
              return [];
            }

            return [
              `Altitude: ${Math.round(point.altitude)} m`,
              point.heartRate ? `Heart rate: ${Math.round(point.heartRate)} bpm` : '',
              point.velocity ? `Velocity: ${point.velocity.toFixed(2)} m/s` : '',
            ].filter(Boolean);
          },
          label: (context) => {
            if (context.dataset.yAxisID === 'effort') {
              return `Grade adjusted effort: ${context.parsed.y}`;
            }

            return `Elevation difference: ${context.parsed.y.toFixed(1)} m`;
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
        title: {
          display: true,
          text: 'Distance',
          color: '#000000',
          font: {
            size: 12,
            weight: '800',
          },
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
          color: 'rgba(0, 0, 0, 0.16)',
        },
        title: {
          display: true,
          text: 'Elevation difference',
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

export default function ElevationBarChart({ streams, isLoading, error }) {
  const profilePoints = getProfilePoints(streams);
  const hasProfile = profilePoints.length > 0;
  const labels = hasProfile
    ? profilePoints.map((point) => formatDistance(point.distanceKm))
    : [];
  const options = hasProfile ? getChartOptions(profilePoints) : null;
  const data = hasProfile
    ? {
        labels,
        datasets: [
          {
            type: 'bar',
            label: 'Elevation difference',
            data: profilePoints.map((point) => point.elevationDifference),
            backgroundColor: (context) =>
              context.raw >= 0 ? 'rgba(38, 251, 0, 0.94)' : 'rgb(255, 0, 195)',
            borderColor: '#16a34a',
            borderWidth: 0,
            borderRadius: 3,
            maxBarThickness: 10,
            yAxisID: 'elevation',
          },
          {
            type: 'line',
            label: 'Grade adjusted effort',
            data: profilePoints.map((point) => point.gradeAdjustedEffort),
            fill: false,
            borderColor: ' #ff6b35',
            backgroundColor: '#ff6b35',
            pointBackgroundColor: '#ffedd5',
            pointBorderColor: '#c2410c',
            pointRadius: profilePoints.length > 80 ? 0 : 2,
            pointHoverRadius: 5,
            tension: 0.3,
            borderWidth: 3,
            yAxisID: 'effort',
          },
        ],
      }
    : null;

  return (
    <ChartPanel>
      <ChartHeader>
        <ChartTitle>Elevation & Grade Adjusted Effort</ChartTitle>
        <ChartSubtitle>
          Elevation difference bars with effort weighted by climb, heart rate and
          velocity.
        </ChartSubtitle>
      </ChartHeader>
      <ChartWrapper>
        {hasProfile ? (
          <Chart type="bar" data={data} options={options} />
        ) : (
          <EmptyChart>
            {isLoading
              ? 'Loading elevation profile...'
              : error || 'No detailed altitude stream data available for this activity.'}
          </EmptyChart>
        )}
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
  height: 100%;
  min-height: 240px;
  display: grid;
  place-items: center;
  padding: 1rem;
  box-sizing: border-box;
  text-align: center;
  color: #000000;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 14px;

  @media screen and (max-width: 700px) {
    min-height: 220px;
  }
`;
