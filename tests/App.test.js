import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import Activities from '../src/pages/AthleteActivities';

jest.mock('react-chartjs-2', () => ({
  Doughnut: () => <div data-testid="doughnut-chart" />,
  Line: () => <div data-testid="line-chart" />,
  Chart: () => <div data-testid="performance-chart" />,
}));

const theme = {
  colour: {
    red: 'hsl(357, 100%, 60%)',
    strava: '#fc4c02',
    ghostwhite: 'hsl(240, 100, 99)',
    yellow: 'hsl(47, 100%, 50%)',
    green: 'hsl(100, 66%, 46%)',
    blue: 'hsl(209, 100%, 58%)',
    purple: 'hsl(267, 100%, 66%)',
    grey: 'hsl(0, 0%, 20%)',
    black: 'hsl(0, 0%, 0%)',
    white: 'hsl(100, 100%, 100%)',
    error: 'hsl(0, 100%, 50%)',
  },
  loading: {},
};

const renderWithTheme = (ui) =>
  render(
    <MemoryRouter>
      <ThemeProvider theme={theme}>{ui}</ThemeProvider>
    </MemoryRouter>,
  );

beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value: true,
  });
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: 1024,
  });
});

test('renders the Strava login screen when unauthenticated', () => {
  renderWithTheme(<Activities />);

  expect(screen.getByAltText(/strava connect button/i)).toBeInTheDocument();
  expect(screen.getByAltText(/powered by strava/i)).toBeInTheDocument();
});

test('renders cached activities without an access token', async () => {
  localStorage.setItem(
    'activities',
    JSON.stringify([
      {
        id: 1,
        name: 'Cached morning run',
        sport_type: 'Run',
        start_date: '2026-05-01T08:00:00Z',
        distance: 5000,
        moving_time: 1500,
        total_elevation_gain: 50,
        average_heartrate: 140,
        kudos_count: 3,
        map: {},
      },
    ]),
  );

  renderWithTheme(<Activities />);

  expect(await screen.findByText('Cached morning run')).toBeInTheDocument();
  expect(screen.queryByAltText(/strava connect button/i)).not.toBeInTheDocument();
});

test('renders cached stream metrics on desktop while offline', async () => {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value: false,
  });
  localStorage.setItem(
    'activities',
    JSON.stringify([
      {
        id: 1,
        name: 'Offline morning run',
        sport_type: 'Run',
        start_date_local: '2026-05-01T08:00:00',
        distance: 5000,
        moving_time: 1500,
        total_elevation_gain: 50,
        average_heartrate: 140,
        average_speed: 3.5,
        map: {},
      },
    ]),
  );
  localStorage.setItem(
    'performance-effort-v1-1',
    JSON.stringify({
      effort: 112,
      climbingShare: 24,
      averageClimbingGrade: 6,
      elevationGain: 120,
      averageHeartRate: 145,
    }),
  );

  renderWithTheme(<Activities />);

  expect(await screen.findByText('Performance Over Time')).toBeInTheDocument();
  expect(await screen.findByTestId('performance-chart')).toBeInTheDocument();
});

test('hides the performance chart below the 700px desktop breakpoint', async () => {
  window.innerWidth = 400;
  localStorage.setItem(
    'activities',
    JSON.stringify([
      {
        id: 1,
        name: 'Mobile morning run',
        sport_type: 'Run',
        start_date: '2026-05-01T08:00:00Z',
        distance: 5000,
        moving_time: 1500,
        map: {},
      },
    ]),
  );

  renderWithTheme(<Activities />);

  expect(await screen.findByText('Mobile morning run')).toBeInTheDocument();
  expect(screen.queryByText('Performance Over Time')).not.toBeInTheDocument();
  expect(screen.queryByTestId('performance-chart')).not.toBeInTheDocument();
});
