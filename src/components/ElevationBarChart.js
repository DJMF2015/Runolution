import React from 'react';
import styled from 'styled-components';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import {
  getGradeAdjustedEffort,
  getStreamData,
} from '../utils/gradeAdjustedEffort';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
);

const METRES_PER_KM = 1000;
const MAX_PROFILE_POINTS = 260;
const toNumber = (value, fallback = null) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
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

const getPerformancePoint = (velocity, isCycling) => {
  if (!Number.isFinite(velocity) || velocity <= 0) {
    return null;
  }

  if (isCycling) {
    return Number((velocity * 3.6).toFixed(1));
  }

  return Number((METRES_PER_KM / (velocity * 60)).toFixed(2));
};

const getProfilePoints = (streams, isCycling = false) => {
  const altitudeStream = getStreamData(streams, 'altitude');
  const distanceStream = getStreamData(streams, 'distance');
  const heartRateStream = getStreamData(streams, 'heartrate');
  const velocityStream = getStreamData(streams, 'velocity_smooth');
  const gradeStream = getStreamData(streams, 'grade_smooth');
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
        gradePercent: toNumber(gradeStream[index]),
        heartRate,
        velocity,
      }),
      heartRate,
      performance: getPerformancePoint(velocity, isCycling),
      velocity,
    });
  });

  return points;
};

const formatDistance = (distanceKm) => {
  return `${Number(distanceKm || 0).toFixed(2)} km`;
};

const getChartOptions = (profilePoints, isCycling = false) => {
  const altitudeRange = getAxisRange(
    profilePoints.map((point) => point.altitude),
    100,
  );
  const effortRange = getAxisRange(
    profilePoints.map((point) => point.gradeAdjustedEffort),
    120,
  );
  const performanceRange = getAxisRange(
    profilePoints.map((point) => point.performance),
    isCycling ? 35 : 6,
  );
  const performanceLabel = isCycling ? 'Speed' : 'Pace';

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
          padding: 12,
          font: {
            size: 11,
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

            if (context.dataset.yAxisID === 'performance') {
              return isCycling`${performanceLabel}: ${context.parsed.y.toFixed(1)} km/h`;
            }

            return `Altitude: ${context.parsed.y.toFixed(1)} m`;
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
          maxTicksLimit: 7,
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
        min: altitudeRange.min,
        suggestedMax: altitudeRange.max,
        ticks: {
          color: '#000000',
          maxTicksLimit: 5,
          callback: (value) => `${value}m`,
        },
        grid: {
          color: 'rgba(15, 23, 42, 0.1)',
        },
        title: {
          display: true,
          text: 'Altitude',
          color: '#000000',
          font: {
            size: 11,
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
          maxTicksLimit: 5,
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
            size: 11,
            weight: '800',
          },
        },
      },
      performance: {
        type: 'linear',
        position: 'right',
        min: Math.max(0, performanceRange.min),
        suggestedMax: performanceRange.max,
        display: false,
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };
};

const getChartDatasets = (profilePoints, isCycling = false) => {
  const datasets = [
    {
      type: 'line',
      label: 'Altitude',
      data: profilePoints.map((point) => point.altitude),
      fill: 'start',
      borderColor: '#2563eb',
      backgroundColor: 'rgba(37, 99, 235, 0.18)',
      pointRadius: 0,
      pointHoverRadius: 4,
      tension: 0.35,
      borderWidth: 2.5,
      yAxisID: 'elevation',
      order: 3,
    },
    {
      type: 'line',
      label: 'Grade adjusted effort',
      data: profilePoints.map((point) => point.gradeAdjustedEffort),
      fill: false,
      borderColor: '#ff6b35',
      backgroundColor: '#ff6b35',
      pointBackgroundColor: '#ffedd5',
      pointBorderColor: '#c2410c',
      pointRadius: profilePoints.length > 80 ? 0 : 2,
      pointHoverRadius: 5,
      tension: 0.3,
      borderWidth: 3,
      yAxisID: 'effort',
      order: 1,
    },
  ];

  return datasets;
};

export default function ElevationBarChart({
  streams,
  isLoading,
  error,
  isCycling = false,
}) {
  const profilePoints = getProfilePoints(streams, isCycling);
  const hasProfile = profilePoints.length > 0;
  const labels = hasProfile
    ? profilePoints.map((point) => formatDistance(point.distanceKm))
    : [];
  const options = hasProfile ? getChartOptions(profilePoints, isCycling) : null;
  const data = hasProfile
    ? {
        labels,
        datasets: getChartDatasets(profilePoints, isCycling),
      }
    : null;

  return (
    <ChartPanel>
      <ChartHeader>
        <ChartTitle>Elevation & Grade Adjusted Effort</ChartTitle>
      </ChartHeader>
      <ChartWrapper>
        {hasProfile ? (
          <Chart type="line" data={data} options={options} />
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
  padding: 0;
  box-sizing: border-box;

  @media screen and (max-width: 700px) {
    overflow-x: hidden;
  }
`;

const ChartHeader = styled.div`
  margin-bottom: 0.65rem;
`;

const ChartTitle = styled.h3`
  margin: 0;
  color: #000000;
  font-size: 1rem;
  line-height: 1.2;
`;

const ChartWrapper = styled.div`
  width: 100%;
  max-width: 100%;
  height: clamp(285px, 42vw, 360px);
  min-width: 0;
  position: relative;
  overflow: hidden;

  canvas {
    max-width: 100%;
  }

  @media screen and (max-width: 700px) {
    height: 315px;
  }

  @media screen and (max-width: 420px) {
    height: 300px;
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
