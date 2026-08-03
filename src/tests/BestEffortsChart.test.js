import { fireEvent, render, screen } from '@testing-library/react';
import ActivityStreamChart, {
  buildActivityStreamChartData,
  formatPace,
} from '../components/BestEffortsChart';

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  ComposedChart: ({ children }) => <svg>{children}</svg>,
  Area: ({ dataKey }) => <g data-testid={`${dataKey}-series`} />,
  CartesianGrid: () => null,
  Line: ({ dataKey }) => <g data-testid={`${dataKey}-series`} />,
  Tooltip: () => null,
  XAxis: () => null,
  YAxis: () => null,
}));

const streams = {
  distance: { data: [0, 500, 1000] },
  altitude: { data: [45, 62, 54] },
  heartrate: { data: [128, 146, 158] },
  velocity_smooth: { data: [4, 3.5, 3] },
};

test('builds aligned heart-rate and pace points from Strava streams', () => {
  const result = buildActivityStreamChartData(streams);

  expect(result.xAxisLabel).toBe('Distance (km)');
  expect(result.xValueSuffix).toBe('km');
  expect(result.data).toEqual([
    { position: 0, heartRate: 128, pace: 4.17 },
    { position: 0.5, heartRate: 146, pace: 4.76 },
    { position: 1, heartRate: 158, pace: 5.56 },
  ]);
});

test('supports array-form streams and limits dense streams without losing endpoints', () => {
  const denseValues = Array.from({ length: 501 }, (_, index) => index);
  const result = buildActivityStreamChartData(
    [
      { type: 'distance', data: denseValues.map((value) => value * 10) },
      { type: 'altitude', data: denseValues },
      { type: 'heartrate', data: denseValues.map(() => 150) },
      { type: 'velocity_smooth', data: denseValues.map(() => 4) },
    ],
    250,
  );

  expect(result.data).toHaveLength(250);
  expect(result.data[0].position).toBe(0);
  expect(result.data[result.data.length - 1].position).toBe(5);
  expect(result.data[result.data.length - 1].heartRate).toBe(150);
});

test('falls back to elapsed time and formats decimal pace as minutes per kilometre', () => {
  const result = buildActivityStreamChartData({
    time: { data: [0, 60, 120] },
    altitude: { data: [20, 24, 22] },
    velocity_smooth: { data: [3, 3, 3] },
  });

  expect(result.xAxisLabel).toBe('Elapsed time (min)');
  expect(result.data.map((point) => point.position)).toEqual([0, 1, 2]);
  expect(formatPace(5.5)).toBe('5:30');
});

test('renders heart-rate and pace streams and lets the user isolate them', () => {
  render(<ActivityStreamChart streams={streams} />);

  expect(screen.getByTestId('heartRate-series')).toBeInTheDocument();
  expect(screen.getByTestId('pace-series')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Heart rate' }));

  expect(screen.queryByTestId('heartRate-series')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Heart rate' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
});
