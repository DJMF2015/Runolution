import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ActivityList from '../src/components/ActivityList';
import { getAthleteStreams, getDetailedAthleteData } from '../src/utils/functions';
import { fetchTokenInfo, getNewAccessToken } from '../src/utils/helpers';

jest.mock('../src/utils/functions', () => ({
  getAthleteStreams: jest.fn(),
  getDetailedAthleteData: jest.fn(),
}));

jest.mock('../src/utils/helpers', () => {
  return {
    fetchTokenInfo: jest.fn(),
    getNewAccessToken: jest.fn(),
    isUnauthorizedError: (error) =>
      error?.status === 401 || error?.response?.status === 401,
  };
});

jest.mock('react-chartjs-2', () => ({
  Chart: ({ data }) => (
    <div
      data-testid="elevation-chart"
    />
  ),
  Line: () => <div data-testid="elevation-chart" />,
}));

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  ComposedChart: ({ children, 'aria-label': ariaLabel }) => (
    <svg
      data-testid={
        ariaLabel === 'Elevation and grade adjusted effort by distance'
          ? 'elevation-chart'
          : 'activity-stream-chart'
      }
    >
      {children}
    </svg>
  ),
  Area: () => null,
  CartesianGrid: () => null,
  Line: () => null,
  Tooltip: () => null,
  XAxis: () => null,
  YAxis: () => null,
}));

const summaryActivity = {
  id: 123,
  name: 'Evening Run',
};

const detailedActivity = {
  id: 123,
  name: 'Evening Run',
  laps: [
    {
      id: 1,
      name: 'Lap 1',
      distance: 1609.344,
      total_elevation_gain: 12,
      elapsed_time: 420,
      average_speed: 3.8,
      average_cadence: 82,
      average_heartrate: 145,
      max_heartrate: 160,
      pace_zone: 2,
    },
  ],
  segment_efforts: [
    {
      id: 55,
      name: 'Hill Segment',
      elapsed_time: 180,
      average_heartrate: 150,
      segment: {
        distance: 500,
        maximum_grade: 8,
        average_grade: 4,
        elevation_high: 90,
      },
    },
  ],
};

const cyclingActivity = {
  id: 456,
  name: 'Morning Ride',
  weighted_average_watts: 260,
  normalized_power: 270,
  laps: [
    {
      id: 2,
      name: 'Ride Lap 1',
      distance: 5000,
      total_elevation_gain: 80,
      elapsed_time: 600,
      average_speed: 8.2,
      average_heartrate: 138,
      max_heartrate: 172,
      average_watts: 225,
    },
  ],
  segment_efforts: [
    {
      id: 77,
      name: 'Climb Segment',
      distance: 1200,
      elevation_difference: 96,
      elapsed_time: 260,
      average_heartrate: 151,
      max_heartrate: 178,
      average_watts: 265,
      segment: {
        distance: 1200,
        elevation_high: 180,
      },
    },
  ],
};

const activityStreams = {
  distance: {
    data: [0, 400, 800, 1200, 1609],
  },
  altitude: {
    data: [42, 55, 76, 68, 90],
  },
  heartrate: {
    data: [130, 142, 154, 148, 160],
  },
  velocity_smooth: {
    data: [3.7, 3.4, 3.1, 3.3, 2.9],
  },
};

const renderActivityList = (state) => {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/splits', state }]}>
      <Routes>
        <Route path="/splits" element={<ActivityList />} />
        <Route path="/activities" element={<div>Activities</div>} />
      </Routes>
    </MemoryRouter>,
  );
};

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
});

test('renders charts and tables from detailed activity passed in route state', async () => {
  renderActivityList({
    from: summaryActivity,
    detailedActivity,
    athleteStreams: activityStreams,
  });

  expect(await screen.findByText('Heart Rate & Pace')).toBeInTheDocument();
  expect(
    await screen.findByText('Elevation & Grade Adjusted Effort'),
  ).toBeInTheDocument();
  expect(await screen.findByTestId('activity-stream-chart')).toBeInTheDocument();
  expect(screen.getByTestId('elevation-chart')).toBeInTheDocument();
  expect(screen.getByText('Lap 1')).toBeInTheDocument();
  expect(screen.getByText('Hill Segment')).toBeInTheDocument();
  expect(screen.getByText('Cadence')).toBeInTheDocument();
  expect(screen.queryByText('Avg Watts')).not.toBeInTheDocument();
  expect(getDetailedAthleteData).not.toHaveBeenCalled();
  expect(getAthleteStreams).not.toHaveBeenCalled();
});

test('shows cycling power metrics for ride splits and segment efforts', async () => {
  renderActivityList({
    from: {
      id: 456,
      name: 'Morning Ride',
    },
    detailedActivity: cyclingActivity,
    athleteStreams: activityStreams,
  });

  expect(await screen.findByText('Heart Rate & Pace')).toBeInTheDocument();
  expect(screen.getByText('Ride Lap 1')).toBeInTheDocument();
  expect(screen.getByText('Climb Segment')).toBeInTheDocument();
  expect(screen.getAllByText('Avg Watts').length).toBeGreaterThan(0);
  expect(screen.getAllByText('Weighted Power').length).toBeGreaterThan(0);
  expect(screen.getAllByText('Normalized Power').length).toBeGreaterThan(0);
  expect(screen.getByText('225w')).toBeInTheDocument();
  expect(screen.getByText('265w')).toBeInTheDocument();
  expect(screen.getAllByText('260w').length).toBeGreaterThan(0);
  expect(screen.getAllByText('270w').length).toBeGreaterThan(0);
  expect(screen.queryByText('Cadence')).not.toBeInTheDocument();
  expect(screen.queryByText('Pace Zone')).not.toBeInTheDocument();
});

test('fetches full activity details when only summary activity is routed', async () => {
  fetchTokenInfo.mockResolvedValue('valid-token');
  getDetailedAthleteData.mockResolvedValue({ data: detailedActivity });
  getAthleteStreams.mockResolvedValue({ data: activityStreams });

  renderActivityList({ from: summaryActivity });

  expect(await screen.findByText('Heart Rate & Pace')).toBeInTheDocument();
  expect(
    await screen.findByText('Elevation & Grade Adjusted Effort'),
  ).toBeInTheDocument();
  expect(screen.getByTestId('activity-stream-chart')).toBeInTheDocument();
  expect(await screen.findByTestId('elevation-chart')).toBeInTheDocument();
  expect(screen.getByText('Lap 1')).toBeInTheDocument();
  expect(screen.getByText('Hill Segment')).toBeInTheDocument();
  expect(getDetailedAthleteData).toHaveBeenCalledWith(123, 'valid-token');
  expect(getAthleteStreams).toHaveBeenCalledWith(123, 'valid-token');
});

test('refreshes and retries when the detailed activity request is unauthorized', async () => {
  const unauthorizedError = new Error('Unauthorized');
  unauthorizedError.status = 401;
  fetchTokenInfo.mockResolvedValue('stale-token');
  getNewAccessToken.mockResolvedValue({ access_token: 'refreshed-token' });
  getDetailedAthleteData
    .mockRejectedValueOnce(unauthorizedError)
    .mockResolvedValueOnce({ data: detailedActivity });
  getAthleteStreams.mockResolvedValue({ data: activityStreams });

  renderActivityList({ from: summaryActivity });

  expect(await screen.findByText('Heart Rate & Pace')).toBeInTheDocument();
  expect(
    await screen.findByText('Elevation & Grade Adjusted Effort'),
  ).toBeInTheDocument();
  expect(screen.getByText('Lap 1')).toBeInTheDocument();
  expect(screen.getByText('Hill Segment')).toBeInTheDocument();
  expect(getDetailedAthleteData).toHaveBeenNthCalledWith(1, 123, 'stale-token');
  expect(getDetailedAthleteData).toHaveBeenNthCalledWith(2, 123, 'refreshed-token');
});

test('renders cached full activity details when no token is available', async () => {
  localStorage.setItem('activity-detail-123', JSON.stringify(detailedActivity));
  localStorage.setItem('activity-streams-123', JSON.stringify(activityStreams));
  fetchTokenInfo.mockResolvedValue(null);

  renderActivityList({ from: summaryActivity });

  expect(await screen.findByText('Heart Rate & Pace')).toBeInTheDocument();
  expect(screen.getByText('Elevation & Grade Adjusted Effort')).toBeInTheDocument();
  expect(screen.getByTestId('activity-stream-chart')).toBeInTheDocument();
  expect(screen.getByTestId('elevation-chart')).toBeInTheDocument();
  expect(screen.getByText('Lap 1')).toBeInTheDocument();
  expect(screen.getByText('Hill Segment')).toBeInTheDocument();

  await waitFor(() => {
    expect(getDetailedAthleteData).not.toHaveBeenCalled();
  });
});
