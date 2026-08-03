import { fireEvent, render, screen } from '@testing-library/react';
import ElevationBarChart, {
  getProfilePoints,
} from '../components/ElevationBarChart';

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  ComposedChart: ({ children }) => <svg data-testid="effort-chart">{children}</svg>,
  Area: ({ dataKey }) => <g data-testid={`${dataKey}-series`} />,
  CartesianGrid: () => null,
  Line: ({ dataKey }) => <g data-testid={`${dataKey}-series`} />,
  Tooltip: () => null,
  XAxis: () => null,
  YAxis: () => null,
}));

const streams = {
  altitude: { data: [40, 48, 61, 55] },
  distance: { data: [0, 400, 800, 1200] },
  grade_smooth: { data: [0, 2, 4, -1] },
  heartrate: { data: [128, 138, 151, 147] },
  velocity_smooth: { data: [3.6, 3.4, 3.1, 3.3] },
};

test('builds distance-based elevation and grade-effort points from streams', () => {
  const points = getProfilePoints(streams);

  expect(points).toHaveLength(4);
  expect(points.map((point) => point.distanceKm)).toEqual([0, 0.4, 0.8, 1.2]);
  expect(points.map((point) => point.altitude)).toEqual([40, 48, 61, 55]);
  expect(points.every((point) => Number.isFinite(point.gradeAdjustedEffort))).toBe(
    true,
  );
  expect(points[0].performance).toBeCloseTo(4.63, 2);
});

test('caps dense activity profiles while preserving the final stream point', () => {
  const values = Array.from({ length: 1000 }, (_, index) => index);
  const points = getProfilePoints({
    altitude: { data: values.map((value) => 50 + value / 100) },
    distance: { data: values.map((value) => value * 10) },
    grade_smooth: { data: values.map(() => 1) },
    heartrate: { data: values.map(() => 145) },
    velocity_smooth: { data: values.map(() => 3.2) },
  });

  expect(points.length).toBeLessThanOrEqual(260);
  expect(points[points.length - 1].distanceKm).toBe(9.99);
});

test('renders the Recharts elevation area and effort line', () => {
  render(<ElevationBarChart streams={streams} />);

  expect(screen.getByText('Elevation & Grade Adjusted Effort')).toBeInTheDocument();
  expect(screen.getByTestId('effort-chart')).toBeInTheDocument();
  expect(screen.getByTestId('altitude-series')).toBeInTheDocument();
  expect(screen.getByTestId('gradeAdjustedEffort-series')).toBeInTheDocument();
});

test('toggles the elevation area and grade-effort line from the legend controls', () => {
  render(<ElevationBarChart streams={streams} />);

  const elevationToggle = screen.getByRole('button', { name: 'Elevation' });
  const effortToggle = screen.getByRole('button', { name: 'Grade effort' });

  fireEvent.click(elevationToggle);

  expect(screen.queryByTestId('altitude-series')).not.toBeInTheDocument();
  expect(screen.getByTestId('gradeAdjustedEffort-series')).toBeInTheDocument();
  expect(elevationToggle).toHaveAttribute('aria-pressed', 'false');

  fireEvent.click(effortToggle);

  expect(screen.queryByTestId('gradeAdjustedEffort-series')).not.toBeInTheDocument();
  expect(effortToggle).toHaveAttribute('aria-pressed', 'false');

  fireEvent.click(elevationToggle);

  expect(screen.getByTestId('altitude-series')).toBeInTheDocument();
  expect(elevationToggle).toHaveAttribute('aria-pressed', 'true');
});

test('retains the loading state when altitude streams are unavailable', () => {
  render(<ElevationBarChart streams={null} isLoading />);

  expect(screen.getByText('Loading elevation profile...')).toBeInTheDocument();
  expect(screen.queryByTestId('effort-chart')).not.toBeInTheDocument();
});
