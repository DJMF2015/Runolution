import React, { useEffect, useMemo, useState } from 'react';
import { getAthleteStats } from '../utils/functions';
import { fetchTokenInfo, isUnauthorizedError } from '../utils/helpers';
import styled from 'styled-components';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

const ACTIVITY_TYPES = [
  {
    key: 'ride',
    label: 'Rides',
    colour: '#fc5200',
    softColour: 'rgba(252, 82, 0, 0.18)',
    matches: ['ride', 'virtualride', 'ebikeride', 'mountainbikeride'],
  },
  {
    key: 'run',
    label: 'Runs',
    colour: '#22c55e',
    softColour: 'rgba(34, 197, 94, 0.18)',
    matches: ['run', 'virtualrun', 'trailrun'],
  },
  {
    key: 'swim',
    label: 'Swims',
    colour: '#38bdf8',
    softColour: 'rgba(56, 189, 248, 0.18)',
    matches: ['swim'],
  },
];

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const getActivityType = (activity) => {
  return String(activity?.sport_type || activity?.type || '').toLowerCase();
};

const countActivitiesByType = (activities, type) => {
  return activities.filter((activity) => type.matches.includes(getActivityType(activity)))
    .length;
};

export const options = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '68%',
  radius: '94%',
  animation: {
    animateRotate: true,
    duration: 900,
  },
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        boxWidth: 10,
        boxHeight: 10,
        color: '#e5e7eb',
        font: {
          size: 12,
          weight: 700,
        },
        padding: 18,
        usePointStyle: true,
      },
    },
    tooltip: {
      backgroundColor: '#0f172a',
      borderColor: 'rgba(148, 163, 184, 0.32)',
      borderWidth: 1,
      displayColors: true,
      padding: 12,
      titleColor: '#ffffff',
      bodyColor: '#e5e7eb',
      callbacks: {
        label: (context) => {
          const label = context.label || '';
          const value = context.parsed || 0;
          const dataset = context.dataset.label || 'Activities';

          return `${dataset}: ${label} ${value.toLocaleString('en-GB')}`;
        },
      },
    },
  },
};

const BreakdownChart = ({ props, onAuthError }) => {
  const athlete = JSON.parse(localStorage.getItem('athlete'));
  const activities = useMemo(() => (Array.isArray(props) ? props : []), [props]);
  const [allTimeTotals, setAllTimeTotals] = useState({
    ride: 0,
    run: 0,
    swim: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!athlete?.id) {
        setIsLoading(false);
        return;
      }

      try {
        const accessToken = await fetchTokenInfo();

        if (!accessToken) {
          setIsLoading(false);
          return;
        }

        const athleteStats = await getAthleteStats(athlete.id, accessToken);
        const stats = athleteStats?.data || {};

        setAllTimeTotals({
          ride: toNumber(stats.all_ride_totals?.count),
          run: toNumber(stats.all_run_totals?.count),
          swim: toNumber(stats.all_swim_totals?.count),
        });
      } catch (error) {
        if (isUnauthorizedError(error)) {
          onAuthError?.(error);
          return;
        }

        console.error(error.message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [athlete?.id, onAuthError]);

  const recentTotals = useMemo(() => {
    return ACTIVITY_TYPES.reduce((totals, type) => {
      return {
        ...totals,
        [type.key]: countActivitiesByType(activities, type),
      };
    }, {});
  }, [activities]);

  const totalAllTimeActivities = Object.values(allTimeTotals).reduce(
    (sum, value) => sum + value,
    0,
  );
  const loadedActivityCount = activities.length;
  const hasAllTimeData = totalAllTimeActivities > 0;
  const displayTotals = hasAllTimeData ? allTimeTotals : recentTotals;
  const displayTotalActivities = hasAllTimeData
    ? totalAllTimeActivities
    : Object.values(recentTotals).reduce((sum, value) => sum + value, 0);
  const hasData = displayTotalActivities > 0 || loadedActivityCount > 0;

  if (isLoading) {
    return <ChartShell>Loading activity breakdown...</ChartShell>;
  }

  if (!hasData) {
    return <ChartShell>No activity breakdown data available.</ChartShell>;
  }

  const data = {
    labels: ACTIVITY_TYPES.map((type) => type.label),
    datasets: [
      {
        label: hasAllTimeData ? 'All time' : 'Loaded',
        data: ACTIVITY_TYPES.map((type) => displayTotals[type.key]),
        backgroundColor: ACTIVITY_TYPES.map((type) => type.colour),
        borderColor: '#0f172a',
        borderRadius: 8,
        borderWidth: 4,
        hoverOffset: 10,
        spacing: 3,
      },
      ...(hasAllTimeData
        ? [
            {
              label: 'Loaded',
              data: ACTIVITY_TYPES.map((type) => recentTotals[type.key]),
              backgroundColor: ACTIVITY_TYPES.map((type) => type.softColour),
              borderColor: '#0f172a',
              borderRadius: 8,
              borderWidth: 3,
              hoverOffset: 8,
              spacing: 3,
            },
          ]
        : []),
    ],
  };

  return (
    <ChartPanel>
      <ChartHeader>
        <div>
          <Eyebrow>Activity Mix</Eyebrow>
          <ChartTitle>Breakdown</ChartTitle>
        </div>

        <TotalPill>{loadedActivityCount.toLocaleString('en-GB')} loaded</TotalPill>
      </ChartHeader>

      <ChartGrid>
        <ChartCanvasWrap>
          <Doughnut data={data} options={options} />
          <CentreMetric>
            <CentreValue>{displayTotalActivities.toLocaleString('en-GB')}</CentreValue>
            <CentreLabel>{hasAllTimeData ? 'all time' : 'loaded'}</CentreLabel>
          </CentreMetric>
        </ChartCanvasWrap>

        <StatsList>
          {ACTIVITY_TYPES.map((type) => {
            const displayTotal = displayTotals[type.key];
            const recent = recentTotals[type.key];
            const percentage =
              displayTotalActivities > 0
                ? Math.round((displayTotal / displayTotalActivities) * 100)
                : 0;

            return (
              <StatRow key={type.key}>
                <StatColour style={{ background: type.colour }} />

                <StatContent>
                  <StatTopLine>
                    <StatLabel>{type.label}</StatLabel>
                    <StatValue>{displayTotal.toLocaleString('en-GB')}</StatValue>
                  </StatTopLine>

                  <ProgressTrack>
                    <ProgressFill
                      style={{
                        background: type.colour,
                        width: `${percentage}%`,
                      }}
                    />
                  </ProgressTrack>

                  <StatMeta>
                    {percentage}% {hasAllTimeData ? 'of all time' : 'of loaded'} /{' '}
                    {recent.toLocaleString('en-GB')} loaded
                  </StatMeta>
                </StatContent>
              </StatRow>
            );
          })}
        </StatsList>
      </ChartGrid>
    </ChartPanel>
  );
};

export default BreakdownChart;

const ChartShell = styled.section`
  width: 100%;
  min-height: 220px;
  display: grid;
  place-items: center;
  margin: 0 0 1.25rem;
  padding: 1rem;
  color: #cbd5e1;
  background: rgba(15, 23, 42, 0.82);
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 18px;
  box-sizing: border-box;
`;

const ChartPanel = styled.section`
  position: relative;
  overflow: hidden;
  width: 100%;
  margin: 0 0 1.25rem;
  padding: 1.25rem;
  color: #ffffff;
  background:
    linear-gradient(135deg, rgba(252, 82, 0, 0.2), transparent 34%),
    linear-gradient(145deg, #121826 0%, #0f172a 52%, #111827 100%);
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 18px;
  box-shadow: 0 22px 46px rgba(0, 0, 0, 0.34);
  box-sizing: border-box;

  @media screen and (max-width: 560px) {
    padding: 0.9rem;
    border-radius: 14px;
  }
`;

const ChartHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const Eyebrow = styled.p`
  margin: 0 0 0.2rem;
  color: #fb923c;
  font-size: 0.78rem;
  font-weight: 800;
  text-transform: uppercase;
`;

const ChartTitle = styled.h2`
  margin: 0;
  font-size: clamp(1.2rem, 3vw, 1.65rem);
  line-height: 1;
`;

const TotalPill = styled.span`
  flex: 0 0 auto;
  padding: 0.4rem 0.65rem;
  color: #fed7aa;
  background: rgba(252, 82, 0, 0.16);
  border: 1px solid rgba(251, 146, 60, 0.32);
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 800;
`;

const ChartGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(240px, 0.95fr) minmax(280px, 1.05fr);
  gap: 1.25rem;
  align-items: center;

  @media screen and (max-width: 780px) {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
`;

const ChartCanvasWrap = styled.div`
  position: relative;
  width: min(100%, 360px);
  height: 350px;
  margin: 0 auto;

  canvas {
    max-width: 100%;
  }

  @media screen and (max-width: 560px) {
    width: min(100%, 280px);
    height: 250px;
  }
`;

const CentreMetric = styled.div`
  position: absolute;
  inset: 50% auto auto 50%;
  transform: translate(-50%, -58%);
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: none;
`;

const CentreValue = styled.span`
  max-width: 8ch;
  color: #ffffff;
  font-size: clamp(1.35rem, 5vw, 2rem);
  font-weight: 900;
  line-height: 1;
  overflow-wrap: anywhere;
`;

const CentreLabel = styled.span`
  margin-top: 0.25rem;
  color: #94a3b8;
  font-size: 0.76rem;
  font-weight: 800;
  text-transform: uppercase;
`;

const StatsList = styled.div`
  display: grid;
  gap: 0.85rem;
`;

const StatRow = styled.article`
  display: grid;
  grid-template-columns: 0.75rem minmax(0, 1fr);
  gap: 0.75rem;
  align-items: start;
  padding: 0.85rem;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(226, 232, 240, 0.1);
  border-radius: 12px;
`;

const StatColour = styled.span`
  width: 0.75rem;
  height: 0.75rem;
  margin-top: 0.2rem;
  border-radius: 50%;
  box-shadow: 0 0 20px currentColor;
`;

const StatContent = styled.div`
  min-width: 0;
`;

const StatTopLine = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
`;

const StatLabel = styled.span`
  color: #f8fafc;
  font-weight: 800;
`;

const StatValue = styled.span`
  color: #ffffff;
  font-size: 1.2rem;
  font-weight: 900;
  overflow-wrap: anywhere;
`;

const ProgressTrack = styled.div`
  height: 0.45rem;
  margin: 0.6rem 0 0.45rem;
  overflow: hidden;
  background: rgba(148, 163, 184, 0.2);
  border-radius: 999px;
`;

const ProgressFill = styled.div`
  height: 100%;
  min-width: 0.3rem;
  border-radius: inherit;
`;

const StatMeta = styled.p`
  margin: 0;
  color: #cbd5e1;
  font-size: 0.78rem;
`;
