import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ActivityList from '../src/components/ActivityList';
import { getDetailedAthleteData } from '../src/utils/functions';
import { fetchTokenInfo, getNewAccessToken } from '../src/utils/helpers';

jest.mock('../src/utils/functions', () => ({
  getDetailedAthleteData: jest.fn(),
}));

jest.mock('../src/utils/helpers', () => {
  const actual = jest.requireActual('../src/utils/helpers');

  return {
    ...actual,
    fetchTokenInfo: jest.fn(),
    getNewAccessToken: jest.fn(),
  };
});

jest.mock('react-chartjs-2', () => ({
  Chart: () => <div data-testid="best-efforts-chart" />,
  Line: () => <div data-testid="elevation-chart" />,
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
  renderActivityList({ from: summaryActivity, detailedActivity });

  expect(await screen.findByText('Mile Splits')).toBeInTheDocument();
  expect(screen.getByText('Elevation & Grade Adjusted Pace')).toBeInTheDocument();
  expect(screen.getByTestId('best-efforts-chart')).toBeInTheDocument();
  expect(screen.getByTestId('elevation-chart')).toBeInTheDocument();
  expect(screen.getByText('Lap 1')).toBeInTheDocument();
  expect(screen.getByText('Hill Segment')).toBeInTheDocument();
  expect(getDetailedAthleteData).not.toHaveBeenCalled();
});

test('fetches full activity details when only summary activity is routed', async () => {
  fetchTokenInfo.mockResolvedValue('valid-token');
  getDetailedAthleteData.mockResolvedValue({ data: detailedActivity });

  renderActivityList({ from: summaryActivity });

  expect(await screen.findByText('Mile Splits')).toBeInTheDocument();
  expect(screen.getByText('Elevation & Grade Adjusted Pace')).toBeInTheDocument();
  expect(screen.getByTestId('best-efforts-chart')).toBeInTheDocument();
  expect(screen.getByTestId('elevation-chart')).toBeInTheDocument();
  expect(screen.getByText('Lap 1')).toBeInTheDocument();
  expect(screen.getByText('Hill Segment')).toBeInTheDocument();
  expect(getDetailedAthleteData).toHaveBeenCalledWith(123, 'valid-token');
});

test('refreshes and retries when the detailed activity request is unauthorized', async () => {
  const unauthorizedError = new Error('Unauthorized');
  unauthorizedError.status = 401;
  fetchTokenInfo.mockResolvedValue('stale-token');
  getNewAccessToken.mockResolvedValue({ access_token: 'refreshed-token' });
  getDetailedAthleteData
    .mockRejectedValueOnce(unauthorizedError)
    .mockResolvedValueOnce({ data: detailedActivity });

  renderActivityList({ from: summaryActivity });

  expect(await screen.findByText('Mile Splits')).toBeInTheDocument();
  expect(screen.getByText('Elevation & Grade Adjusted Pace')).toBeInTheDocument();
  expect(screen.getByText('Lap 1')).toBeInTheDocument();
  expect(screen.getByText('Hill Segment')).toBeInTheDocument();
  expect(getDetailedAthleteData).toHaveBeenNthCalledWith(1, 123, 'stale-token');
  expect(getDetailedAthleteData).toHaveBeenNthCalledWith(2, 123, 'refreshed-token');
});

test('renders cached full activity details when no token is available', async () => {
  localStorage.setItem('activity-detail-123', JSON.stringify(detailedActivity));
  fetchTokenInfo.mockResolvedValue(null);

  renderActivityList({ from: summaryActivity });

  expect(await screen.findByText('Mile Splits')).toBeInTheDocument();
  expect(screen.getByText('Elevation & Grade Adjusted Pace')).toBeInTheDocument();
  expect(screen.getByTestId('best-efforts-chart')).toBeInTheDocument();
  expect(screen.getByTestId('elevation-chart')).toBeInTheDocument();
  expect(screen.getByText('Lap 1')).toBeInTheDocument();
  expect(screen.getByText('Hill Segment')).toBeInTheDocument();

  await waitFor(() => {
    expect(getDetailedAthleteData).not.toHaveBeenCalled();
  });
});
