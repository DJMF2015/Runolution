import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler,
);

const speedToPace = (speed) => {
  if (!speed || speed <= 0) return null;

  // Strava average_speed is metres per second.
  const pace = 1000 / (speed * 60);

  return Number(pace.toFixed(2));
};

const calculateEffortScore = (activity) => {
  const elevation = activity.total_elevation_gain || 0;
  const heartRate = activity.average_heartrate || 0;
  const pace = speedToPace(activity.average_speed);

  const paceScore = pace ? (6 / pace) * 100 : 0;

  return Number((elevation * 0.5 + heartRate * 0.3 + paceScore * 0.2).toFixed(2));
};

const movingAverage = (data, windowSize = 3) => {
  return data.map((_, index) => {
    const start = Math.max(0, index - windowSize + 1);
    const values = data
      .slice(start, index + 1)
      .filter((value) => value !== null && value !== undefined);

    if (!values.length) return null;

    const average = values.reduce((sum, value) => sum + value, 0) / values.length;

    return Number(average.toFixed(2));
  });
};

const formatPace = (decimalPace) => {
  if (!decimalPace) return 'N/A';

  const minutes = Math.floor(decimalPace);
  const seconds = Math.round((decimalPace - minutes) * 60);

  return `${minutes}:${String(seconds).padStart(2, '0')} /km`;
};

const StravaMetricsChart = ({ activities = [] }) => {
  const recentActivities = [...activities]
    .filter((activity) => activity.start_date)
    .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
    .slice(-30);

  const labels = recentActivities.map((activity) =>
    new Date(activity.start_date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
    }),
  );

  const elevationData = recentActivities.map(
    (activity) => activity.total_elevation_gain || 0,
  );

  const heartRateData = movingAverage(
    recentActivities.map((activity) => activity.average_heartrate || null),
    3,
  );

  const paceData = movingAverage(
    recentActivities.map((activity) => speedToPace(activity.average_speed)),
    3,
  );

  const effortData = movingAverage(
    recentActivities.map((activity) => calculateEffortScore(activity)),
    3,
  );

  const data = {
    labels,
    datasets: [
      {
        label: 'Elevation Gain (m)',
        data: elevationData,
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.12)',
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 5,
        borderWidth: 2,
        yAxisID: 'y',
      },
      {
        label: 'Avg Heart Rate (bpm)',
        data: heartRateData,
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.12)',
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 5,
        borderWidth: 2,
        yAxisID: 'y1',
      },
      {
        label: 'Pace (min/km)',
        data: paceData,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.12)',
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 5,
        borderWidth: 2,
        yAxisID: 'y2',
      },

      {
        label: 'Effort Score',
        data: effortData,
        borderColor: '#a855f7',
        backgroundColor: 'rgba(168, 85, 247, 0.12)',
        borderDash: [6, 6],
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 5,
        borderWidth: 2,
        yAxisID: 'y3 ',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          boxWidth: 12,
          usePointStyle: true,
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.dataset.label;
            const value = context.parsed.y;

            if (label === 'Pace (min/km)') {
              return `${label}: ${formatPace(value)}`;
            }

            return `${label}: ${value}`;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 8,
        },
        grid: {
          display: false,
        },
      },
      y: {
        type: 'linear',
        position: 'left',
        title: {
          display: true,
          text: 'Elevation / Effort',
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.06)',
        },
      },
      y1: {
        type: 'linear',
        position: 'right',
        title: {
          display: true,
          text: 'Heart Rate',
        },
        grid: {
          drawOnChartArea: false,
        },
        min: 80,
        max: 200,
      },
      y2: {
        type: 'linear',
        position: 'right',
        display: false,
        reverse: true,
      },
    },
  };

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <h3 style={styles.title}>Performance Over Time</h3>
        <p style={styles.subtitle}>
          Distance, heart rate, pace and effort score across recent Strava activities
        </p>
      </div>

      <div style={styles.chartWrapper}>
        <Line data={data} options={options} />
      </div>
    </div>
  );
};

const styles = {
  card: {
    marginTop: 0,
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    padding: '20px',
    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
    width: '100%',
    maxWidth: '900px',
    boxSizing: 'border-box',
  },
  header: {
    marginBottom: '12px',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 700,
    color: '#111827',
  },
  subtitle: {
    margin: '4px 0 0',
    fontSize: '13px',
    color: '#6b7280',
  },
  chartWrapper: {
    height: '300px',
    width: '100%',
  },
};

export default StravaMetricsChart;
