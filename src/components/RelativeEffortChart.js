import React, { useMemo } from 'react';
import { Chart } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js';
import { buildPerformancePeriods } from '../utils/performanceMetrics';

export {
  getActivityStartDate,
  getRollingSixMonthActivities,
} from '../utils/performanceMetrics';

ChartJS.register(
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
);

const getEffortColor = (effort) => {
  if (!Number.isFinite(effort)) return 'rgba(148, 163, 184, 0.35)';
  if (effort >= 120) return 'rgba(220, 38, 38, 0.82)';
  if (effort >= 105) return 'rgba(249, 115, 22, 0.84)';
  return 'rgba(22, 163, 74, 0.8)';
};

const StravaMetricsChart = ({
  activities = [],
  error,
  isLoading = false,
  metricsByActivity = {},
  referenceDate = new Date(),
}) => {
  const referenceTime = new Date(referenceDate).getTime();
  const periods = useMemo(
    () =>
      buildPerformancePeriods(
        activities,
        metricsByActivity,
        new Date(referenceTime),
      ),
    [activities, metricsByActivity, referenceTime],
  );
  const populatedPeriods = periods.filter((period) => Number.isFinite(period.effort));
  const latestPeriod = [...populatedPeriods].pop();

  const data = {
    labels: periods.map((period) => period.label),
    datasets: [
      {
        type: 'bar',
        label: 'Grade-adjusted effort',
        data: periods.map((period) => period.effort),
        backgroundColor: periods.map((period) => getEffortColor(period.effort)),
        borderColor: periods.map((period) => getEffortColor(period.effort)),
        borderWidth: 1,
        borderRadius: 4,
        maxBarThickness: 76,
        yAxisID: 'effort',
        order: 2,
      },
      {
        type: 'line',
        label: 'Climbing share',
        data: periods.map((period) => period.climbingShare),
        borderColor: '#0891b2',
        backgroundColor: '#ecfeff',
        pointBackgroundColor: '#ffffff',
        pointBorderColor: '#0891b2',
        pointBorderWidth: 2,
        tension: 0.32,
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 2.5,
        yAxisID: 'climbing',
        spanGaps: true,
        order: 1,
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
        position: 'bottom',
        labels: {
          color: '#334155',
          boxWidth: 10,
          usePointStyle: true,
          padding: 18,
          font: {
            size: 12,
            weight: '600',
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.96)',
        borderColor: 'rgba(148, 163, 184, 0.35)',
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: (context) => {
            if (context.dataset.yAxisID === 'climbing') {
              return `Climbing share: ${context.parsed.y}%`;
            }

            return `Grade-adjusted effort: ${context.parsed.y}`;
          },
          afterBody: (items) => {
            const period = periods[items[0]?.dataIndex];

            if (!period?.activityCount) return [];

            return [
              `${period.activityCount} streamed activities`,
              `Average climbing grade: ${period.averageClimbingGrade}%`,
              `Elevation gain sampled: ${Math.round(period.elevationGain)} m`,
              period.averageHeartRate
                ? `Average heart rate: ${Math.round(period.averageHeartRate)} bpm`
                : '',
            ].filter(Boolean);
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 6,
          color: '#64748b',
          font: {
            size: 11,
            weight: '600',
          },
        },
        grid: {
          display: false,
        },
      },
      effort: {
        type: 'linear',
        position: 'left',
        suggestedMin: 80,
        suggestedMax: 130,
        title: {
          display: true,
          text: 'Effort index',
          color: '#475569',
        },
        ticks: {
          color: '#64748b',
          maxTicksLimit: 6,
        },
        grid: {
          color: 'rgba(148, 163, 184, 0.18)',
        },
      },
      climbing: {
        type: 'linear',
        position: 'right',
        min: 0,
        max: 100,
        title: {
          display: true,
          text: 'Climbing share',
          color: '#475569',
        },
        ticks: {
          color: '#64748b',
          maxTicksLimit: 6,
          callback: (value) => `${value}%`,
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <div>
          <span style={styles.eyebrow}>GRADE-ADJUSTED STREAM ANALYSIS</span>
          <h3 style={styles.title}>Performance Over Time</h3>
        </div>
        <p style={styles.subtitle}>
          Terrain, pace and heart-rate load across the latest six months
        </p>
      </div>

      {populatedPeriods.length > 0 && (
        <div style={styles.summary}>
          <div>
            <span style={styles.summaryLabel}>Latest effort</span>
            <strong style={styles.summaryValue}>{latestPeriod.effort}</strong>
          </div>
          <div>
            <span style={styles.summaryLabel}>Climbing share</span>
            <strong style={styles.summaryValue}>
              {latestPeriod.climbingShare ?? 0}%
            </strong>
          </div>
          <div>
            <span style={styles.summaryLabel}>Streamed activities</span>
            <strong style={styles.summaryValue}>
              {populatedPeriods.reduce(
                (total, period) => total + period.activityCount,
                0,
              )}
            </strong>
          </div>
        </div>
      )}

      <div style={styles.chartWrapper}>
        {populatedPeriods.length ? (
          <Chart type="bar" data={data} options={options} />
        ) : (
          <div style={styles.emptyState}>
            {isLoading
              ? 'Analysing grade-related activity streams...'
              : error || 'No grade-related stream data is available yet.'}
          </div>
        )}
      </div>
      {isLoading && populatedPeriods.length > 0 && (
        <p style={styles.loadingNote}>Updating with additional activity streams...</p>
      )}
    </div>
  );
};

const styles = {
  card: {
    marginTop: 0,
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '22px',
    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
    width: '100%',
    maxWidth: 'none',
    minWidth: 0,
    overflow: 'hidden',
    boxSizing: 'border-box',
  },
  header: {
    marginBottom: '16px',
  },
  eyebrow: {
    display: 'block',
    marginBottom: '5px',
    color: '#ea580c',
    fontSize: '11px',
    fontWeight: 800,
    letterSpacing: 0,
  },
  title: {
    margin: 0,
    fontSize: '21px',
    fontWeight: 800,
    color: '#0f172a',
  },
  subtitle: {
    margin: '4px 0 0',
    fontSize: '13px',
    color: '#64748b',
  },
  summary: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '28px',
    paddingBottom: '16px',
    borderBottom: '1px solid #e2e8f0',
    marginBottom: '12px',
  },
  summaryLabel: {
    display: 'block',
    marginBottom: '2px',
    color: '#64748b',
    fontSize: '11px',
    fontWeight: 700,
  },
  summaryValue: {
    color: '#0f172a',
    fontSize: '18px',
    fontWeight: 800,
  },
  chartWrapper: {
    position: 'relative',
    height: 'clamp(330px, 38vw, 430px)',
    width: '100%',
    minWidth: 0,
  },
  emptyState: {
    display: 'grid',
    placeItems: 'center',
    width: '100%',
    height: '100%',
    color: '#64748b',
    fontSize: '14px',
    textAlign: 'center',
  },
  loadingNote: {
    margin: '4px 0 0',
    color: '#64748b',
    fontSize: '12px',
  },
};

export default StravaMetricsChart;
