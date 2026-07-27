import React from 'react';
import { render, screen } from '@testing-library/react';
import StravaMetricsChart, {
  getRollingSixMonthActivities,
} from '../src/components/RelativeEffortChart';
import {
  buildPerformancePeriods,
  getRollingSixMonthPeriods,
  selectBalancedStreamActivities,
} from '../src/utils/performanceMetrics';

jest.mock('react-chartjs-2', () => ({
  Chart: ({ data }) => (
    <div
      data-testid="performance-chart"
      data-period-count={data.labels.length}
      data-populated-count={data.datasets[0].data.filter(Number.isFinite).length}
    >
      {data.labels.join('|')}
    </div>
  ),
}));

const createActivity = (id, startDate) => ({
  id,
  sport_type: 'Run',
  start_date: startDate,
  distance: 5000,
  total_elevation_gain: 10,
  average_heartrate: 140,
  average_speed: 3.5,
});

test('returns every activity within the rolling six-month window', () => {
  const activities = [
    createActivity(1, '2025-09-20T08:00:00Z'),
    createActivity(2, '2026-01-24T08:00:00Z'),
    createActivity(3, '2026-01-25T08:00:00Z'),
    createActivity(4, '2026-04-10T08:00:00Z'),
    createActivity(5, '2026-07-23T08:00:00Z'),
    createActivity(6, '2026-07-26T08:00:00Z'),
    createActivity(7, 'invalid-date'),
  ];

  const filteredActivities = getRollingSixMonthActivities(
    activities,
    new Date('2026-07-25T12:00:00Z'),
  );

  expect(filteredActivities.map((activity) => activity.id)).toEqual([3, 4, 5]);
});

test('advances the six-month window with the reference month', () => {
  const activities = [
    createActivity(1, '2026-01-25T08:00:00Z'),
    createActivity(2, '2026-02-25T08:00:00Z'),
    createActivity(3, '2026-08-20T08:00:00Z'),
  ];

  const julyActivities = getRollingSixMonthActivities(
    activities,
    new Date('2026-07-25T12:00:00Z'),
  );
  const augustActivities = getRollingSixMonthActivities(
    activities,
    new Date('2026-08-25T12:00:00Z'),
  );

  expect(julyActivities.map((activity) => activity.id)).toEqual([1, 2]);
  expect(augustActivities.map((activity) => activity.id)).toEqual([2, 3]);
});

test('accepts local Strava dates restored from storage', () => {
  const activities = [
    {
      id: 1,
      start_date_local: '2026-06-12T07:30:00',
      sport_type: 'Run',
    },
  ];

  const filteredActivities = getRollingSixMonthActivities(
    activities,
    new Date('2026-07-25T12:00:00Z'),
  );
  expect(filteredActivities).toHaveLength(1);
});

test('creates six rolling periods ending on the reference date', () => {
  const periods = getRollingSixMonthPeriods(new Date('2026-07-27T12:00:00Z'));

  expect(periods).toHaveLength(6);
  expect(periods[0].start.toISOString()).toBe('2026-01-27T00:00:00.000Z');
  expect(periods[0].end.toISOString()).toBe('2026-02-26T23:59:59.999Z');
  expect(periods[5].start.toISOString()).toBe('2026-06-27T00:00:00.000Z');
  expect(periods[5].end.toISOString()).toBe('2026-07-27T23:59:59.999Z');
});

test('aggregates stream metrics into their rolling periods', () => {
  const activities = [
    createActivity(1, '2026-02-10T08:00:00Z'),
    createActivity(2, '2026-07-10T08:00:00Z'),
  ];
  const periods = buildPerformancePeriods(
    activities,
    {
      1: { effort: 102, climbingShare: 12, averageClimbingGrade: 4, elevationGain: 80 },
      2: { effort: 118, climbingShare: 32, averageClimbingGrade: 7, elevationGain: 220 },
    },
    new Date('2026-07-27T12:00:00Z'),
  );

  expect(periods).toHaveLength(6);
  expect(periods[0]).toMatchObject({ effort: 102, climbingShare: 12 });
  expect(periods[5]).toMatchObject({ effort: 118, climbingShare: 32 });
});

test('limits stream requests to three representative activities per period', () => {
  const activities = Array.from({ length: 60 }, (_, index) => {
    const month = 2 + Math.floor(index / 10);
    const day = 1 + (index % 10);

    return createActivity(
      index + 1,
      `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T08:00:00Z`,
    );
  });
  const selectedActivities = selectBalancedStreamActivities(
    activities,
    new Date('2026-07-27T12:00:00Z'),
  );

  expect(selectedActivities).toHaveLength(18);
  expect(new Set(selectedActivities.map((activity) => activity.id)).size).toBe(18);
});

test('renders a responsive six-period grade effort chart', () => {
  const activities = [
    createActivity(1, '2026-02-10T08:00:00Z'),
    createActivity(2, '2026-07-10T08:00:00Z'),
  ];

  render(
    <StravaMetricsChart
      activities={activities}
      metricsByActivity={{
        1: { effort: 102, climbingShare: 12, averageClimbingGrade: 4, elevationGain: 80 },
        2: { effort: 118, climbingShare: 32, averageClimbingGrade: 7, elevationGain: 220 },
      }}
      referenceDate={new Date('2026-07-27T12:00:00Z')}
    />,
  );

  const chart = screen.getByTestId('performance-chart');
  const card = screen.getByText('Performance Over Time').parentElement.parentElement
    .parentElement;

  expect(chart).toHaveAttribute('data-period-count', '6');
  expect(chart).toHaveAttribute('data-populated-count', '2');
  expect(card).toHaveStyle({ width: '100%', maxWidth: 'none', minWidth: 0 });
  expect(screen.getByText(/across the latest six months/i)).toBeInTheDocument();
  expect(screen.getByText('Latest effort')).toBeInTheDocument();
});
