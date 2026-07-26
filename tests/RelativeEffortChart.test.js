import React from 'react';
import { render, screen } from '@testing-library/react';
import StravaMetricsChart, {
  buildMetricsChartData,
  getRollingSixMonthActivities,
} from '../src/components/RelativeEffortChart';

jest.mock('react-chartjs-2', () => ({
  Line: ({ data }) => (
    <div
      data-testid="performance-chart"
      data-activity-count={data.datasets[0].data.length}
    >
      {data.labels.join('|')}
    </div>
  ),
}));

const createActivity = (id, startDate) => ({
  id,
  start_date: startDate,
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

test('accepts local Strava dates and numeric values restored from storage', () => {
  const activities = [
    {
      id: 1,
      start_date_local: '2026-06-12T07:30:00',
      total_elevation_gain: '82.5',
      average_heartrate: '146',
      average_speed: '3.75',
    },
  ];

  const filteredActivities = getRollingSixMonthActivities(
    activities,
    new Date('2026-07-25T12:00:00Z'),
  );
  const chartData = buildMetricsChartData(filteredActivities);

  expect(filteredActivities).toHaveLength(1);
  expect(chartData.labels).toHaveLength(1);
  expect(chartData.elevationData).toEqual([82.5]);
  expect(chartData.heartRateData).toEqual([146]);
  expect(chartData.paceData[0]).toBeGreaterThan(0);
  expect(chartData.effortData[0]).toBeGreaterThan(0);
});

test('renders more than 30 activities and fills its container', () => {
  const activities = Array.from({ length: 35 }, (_, index) =>
    createActivity(
      index,
      `2026-06-${String((index % 28) + 1).padStart(2, '0')}T08:00:00Z`,
    ),
  );

  render(
    <StravaMetricsChart
      activities={activities}
      referenceDate={new Date('2026-07-25T12:00:00Z')}
    />,
  );

  const chart = screen.getByTestId('performance-chart');
  const card = screen.getByText('Performance Over Time').parentElement.parentElement;

  expect(chart).toHaveAttribute('data-activity-count', '35');
  expect(card).toHaveStyle({ width: '100%', maxWidth: 'none', minWidth: 0 });
  expect(screen.getByText(/across the last six months/i)).toBeInTheDocument();
});
