import styled from 'styled-components';
import { useLocation, useNavigate } from 'react-router-dom';
import { getSecondstoMinutes, getKmsToMiles, getMstoKmHr } from '../utils/conversion';
import { getAthleteStreams, getDetailedAthleteData } from '../utils/functions';
import { fetchTokenInfo, getNewAccessToken, isUnauthorizedError } from '../utils/helpers';
import { hasCyclingPowerData, isCyclingActivity } from '../utils/activityTypes';
import { useScroll } from '../hooks/useScroll';
import ActivityStreamChart from './BestEffortsChart';
import ElevationChart from './ElevationBarChart';
import { useEffect, useState } from 'react';
import { ArrowUpCircleFill } from '@styled-icons/bootstrap/ArrowUpCircleFill';

const getSplitRows = (activity) => {
  if (activity?.laps?.length) {
    return activity.laps;
  }

  if (activity?.splits_standard?.length) {
    return activity.splits_standard;
  }

  return activity?.splits_metric || [];
};

const getSplitElevation = (split) => {
  return split.total_elevation_gain ?? split.elevation_difference ?? '—';
};

const getPowerValue = (row, keys, fallbackRow) => {
  const rows = [row, fallbackRow].filter(Boolean);

  return keys.reduce((powerValue, key) => {
    if (powerValue !== null && powerValue !== undefined) {
      return powerValue;
    }

    return rows.reduce((rowPowerValue, currentRow) => {
      if (rowPowerValue !== null && rowPowerValue !== undefined) {
        return rowPowerValue;
      }

      return currentRow?.[key] ?? currentRow?.segment?.[key] ?? null;
    }, null);
  }, null);
};

const formatPower = (watts) => {
  const power = Number(watts);

  if (!Number.isFinite(power)) {
    return '—';
  }

  return `${Math.round(power)}w`;
};

const getAverageWatts = (row, fallbackRow) => {
  return formatPower(getPowerValue(row, ['average_watts', 'watts'], fallbackRow));
};

const getWeightedAveragePower = (row, fallbackRow) => {
  return formatPower(
    getPowerValue(
      row,
      ['weighted_average_watts', 'weighted_average_power', 'weighted_average_watts_calc'],
      fallbackRow,
    ),
  );
};

const getNormalizedPower = (row, fallbackRow) => {
  return formatPower(
    getPowerValue(
      row,
      [
        'normalized_power',
        'normalized_power_watts',
        'normalized_watts',
        'np',
        'weighted_average_watts',
        'weighted_average_power',
      ],
      fallbackRow,
    ),
  );
};

const getSplitLabel = (split, index) => {
  return split.name || split.split || index + 1;
};

const getSegmentDistance = (segment) => {
  return segment.segment?.distance ?? segment.distance ?? '—';
};

const getSegmentMaxGrade = (segment) => {
  return segment.segment?.maximum_grade ?? segment.maximum_grade ?? '—';
};

const getSegmentAverageGrade = (segment) => {
  return segment.segment?.average_grade ?? segment.average_grade ?? '—';
};

const getSegmentElevationHigh = (segment) => {
  return segment.segment?.elevation_high ?? segment.elevation_high ?? '—';
};

const getSegmentElevation = (segment) => {
  return (
    segment.elevation_difference ??
    segment.total_elevation_gain ??
    segment.segment?.elevation_difference ??
    segment.segment?.total_elevation_gain ??
    getSegmentElevationHigh(segment)
  );
};

const hasDetailedActivityData = (activity) => {
  return Boolean(
    activity &&
    !Array.isArray(activity) &&
    (activity.laps?.length ||
      activity.splits_standard?.length ||
      activity.splits_metric?.length ||
      activity.best_efforts?.length ||
      activity.segment_efforts?.length),
  );
};

const getDetailedActivityCacheKey = (activityId) => `activity-detail-${activityId}`;
const getActivityStreamsCacheKey = (activityId) => `activity-streams-${activityId}`;
const CACHEABLE_STREAM_KEYS = [
  'altitude',
  'distance',
  'heartrate',
  'velocity_smooth',
  'grade_smooth',
  'moving',
  'time',
  'watts',
];

const getStreamData = (streams, key) => {
  if (Array.isArray(streams)) {
    return streams.find((stream) => stream?.type === key)?.data || [];
  }

  if (Array.isArray(streams?.[key])) {
    return streams[key];
  }

  return streams?.[key]?.data || streams?.streams?.[key]?.data || [];
};

const hasActivityStreamData = (streams) => {
  return getStreamData(streams, 'altitude').length > 1;
};

const hasPowerStreamData = (streams) => {
  return getStreamData(streams, 'watts').some((watts) => Number(watts) > 0);
};

const getCacheableActivityStreams = (streams) => {
  return CACHEABLE_STREAM_KEYS.reduce((cacheableStreams, streamKey) => {
    const streamData = getStreamData(streams, streamKey);

    if (streamData.length) {
      return {
        ...cacheableStreams,
        [streamKey]: { data: streamData },
      };
    }

    return cacheableStreams;
  }, {});
};

const getCachedDetailedActivity = (activityId) => {
  if (!activityId) {
    return null;
  }

  try {
    const cachedActivity = JSON.parse(
      localStorage.getItem(getDetailedActivityCacheKey(activityId)),
    );
    return hasDetailedActivityData(cachedActivity) ? cachedActivity : null;
  } catch (error) {
    return null;
  }
};

const storeDetailedActivity = (activity) => {
  if (!activity?.id || !hasDetailedActivityData(activity)) {
    return;
  }

  localStorage.setItem(
    getDetailedActivityCacheKey(activity.id),
    JSON.stringify(activity),
  );
};

const getCachedActivityStreams = (activityId) => {
  if (!activityId) {
    return null;
  }

  try {
    const cachedStreams = JSON.parse(
      localStorage.getItem(getActivityStreamsCacheKey(activityId)),
    );
    return hasActivityStreamData(cachedStreams) ? cachedStreams : null;
  } catch (error) {
    return null;
  }
};

const storeActivityStreams = (activityId, streams) => {
  if (!activityId || !hasActivityStreamData(streams)) {
    return;
  }

  const cacheKey = getActivityStreamsCacheKey(activityId);
  const cacheableStreams = getCacheableActivityStreams(streams);

  if (!hasActivityStreamData(cacheableStreams)) {
    return;
  }

  try {
    localStorage.setItem(cacheKey, JSON.stringify(cacheableStreams));
  } catch (error) {
    localStorage.removeItem(cacheKey);
    console.warn(`Activity stream cache skipped for ${activityId}: ${error.message}`);
  }
};

const getInitialDetailedActivity = (locationState) => {
  if (hasDetailedActivityData(locationState?.detailedActivity)) {
    return locationState.detailedActivity;
  }

  if (hasDetailedActivityData(locationState?.from)) {
    return locationState.from;
  }

  return getCachedDetailedActivity(
    locationState?.from?.id || locationState?.detailedActivity?.id,
  );
};

const getInitialActivityStreams = (locationState) => {
  if (hasActivityStreamData(locationState?.athleteStreams)) {
    return locationState.athleteStreams;
  }

  const activityId = locationState?.from?.id || locationState?.detailedActivity?.id;

  return getCachedActivityStreams(activityId);
};

const fetchDetailedActivityWithRetry = async (activityId, token) => {
  try {
    return await getDetailedAthleteData(activityId, token);
  } catch (error) {
    if (!isUnauthorizedError(error)) {
      throw error;
    }

    const refreshedPayload = await getNewAccessToken();
    const refreshedToken = refreshedPayload?.access_token;

    if (!refreshedToken) {
      throw error;
    }

    return getDetailedAthleteData(activityId, refreshedToken);
  }
};

const fetchActivityStreamsWithRetry = async (activityId, token) => {
  try {
    return await getAthleteStreams(activityId, token);
  } catch (error) {
    if (!isUnauthorizedError(error)) {
      throw error;
    }

    const refreshedPayload = await getNewAccessToken();
    const refreshedToken = refreshedPayload?.access_token;

    if (!refreshedToken) {
      throw error;
    }

    return getAthleteStreams(activityId, refreshedToken);
  }
};

export default function ActivityList() {
  const location = useLocation();
  const [detailedActivity, setDetailedActivity] = useState(() =>
    getInitialDetailedActivity(location.state),
  );
  const [activityStreams, setActivityStreams] = useState(() =>
    getInitialActivityStreams(location.state),
  );
  const [isDetailLoading, setIsDetailLoading] = useState(!detailedActivity);
  const [isStreamLoading, setIsStreamLoading] = useState(!activityStreams);
  const [detailError, setDetailError] = useState(null);
  const [streamError, setStreamError] = useState(null);
  const { isVisible, scrollToTop } = useScroll();
  const navigate = useNavigate();

  const { from, detailedActivity: routedDetailedActivity } = location.state || {};
  const activityId = from?.id || routedDetailedActivity?.id;
  const isCycling =
    [detailedActivity, routedDetailedActivity, from].some(
      (activity) => isCyclingActivity(activity) || hasCyclingPowerData(activity),
    ) || hasPowerStreamData(activityStreams);

  if (!location.state) {
    navigate('/activities');
  }

  const handleGoBack = () => {
    navigate(-1);
  };
  const splitRows = getSplitRows(detailedActivity);
  const segmentEfforts = detailedActivity?.segment_efforts || [];

  useEffect(() => {
    async function fetchData() {
      const detailedActivityFromState = getInitialDetailedActivity(location.state);

      if (detailedActivityFromState) {
        setDetailedActivity(detailedActivityFromState);
        storeDetailedActivity(detailedActivityFromState);
        setIsDetailLoading(false);
        setDetailError(null);
        return;
      }

      setIsDetailLoading(true);
      setDetailError(null);

      const token = await fetchTokenInfo();

      if (!activityId || !token) {
        setIsDetailLoading(false);
        setDetailError('Activity detail data could not be loaded.');
        return;
      }

      const response = await fetchDetailedActivityWithRetry(activityId, token);
      setDetailedActivity(response.data);
      storeDetailedActivity(response.data);
      setDetailError(null);
      setIsDetailLoading(false);
    }

    fetchData().catch((error) => {
      console.error(error.message);
      setDetailError('Activity detail data could not be loaded.');
      setIsDetailLoading(false);
    });
  }, [activityId, location.state]);

  useEffect(() => {
    async function fetchStreams() {
      const initialStreams = getInitialActivityStreams(location.state);

      if (initialStreams) {
        setActivityStreams(initialStreams);
        storeActivityStreams(activityId, initialStreams);
        setIsStreamLoading(false);
        setStreamError(null);
        return;
      }

      setIsStreamLoading(true);
      setStreamError(null);

      const token = await fetchTokenInfo();

      if (!activityId || !token) {
        setIsStreamLoading(false);
        setStreamError('Elevation stream data could not be loaded.');
        return;
      }

      const response = await fetchActivityStreamsWithRetry(activityId, token);
      setActivityStreams(response.data);
      storeActivityStreams(activityId, response.data);
      setStreamError(null);
      setIsStreamLoading(false);
    }

    fetchStreams().catch((error) => {
      console.error(error.message);
      setStreamError('Elevation stream data could not be loaded.');
      setIsStreamLoading(false);
    });
  }, [activityId, location.state]);

  return (
    <PageContainer>
      {isVisible && <ScrollToTop alt="Go to top" onClick={scrollToTop} />}

      <HeaderCard>
        <HeaderContent>
          <ActivityTitle>{from?.name}</ActivityTitle>
          <BackButton onClick={handleGoBack}>Back</BackButton>
        </HeaderContent>
      </HeaderCard>

      <ChartsGrid>
        <DarkChartCard>
          <DarkChartHeading>Heart Rate & Pace</DarkChartHeading>
          {isStreamLoading ? (
            <DarkDetailLoading>Loading activity streams...</DarkDetailLoading>
          ) : activityStreams ? (
            <ActivityStreamChart streams={activityStreams} />
          ) : (
            <DarkDetailLoading>{streamError}</DarkDetailLoading>
          )}
        </DarkChartCard>

        <DarkChartCard>
          {isDetailLoading ? (
            <DarkDetailLoading>Loading elevation data...</DarkDetailLoading>
          ) : detailedActivity ? (
            <ElevationChart
              streams={activityStreams}
              isLoading={isStreamLoading}
              error={streamError}
              isCycling={isCycling}
            />
          ) : (
            <DarkDetailLoading>{detailError}</DarkDetailLoading>
          )}
        </DarkChartCard>
      </ChartsGrid>

      <ResponsiveSection>
        <SectionTitle>Splits</SectionTitle>

        <ResponsiveTable>
          <thead>
            <tr>
              <th>Split</th>
              <th>Distance</th>
              <th>Elevation</th>
              <th>Elapsed</th>
              <th>Speed</th>
              <th>Avg HR</th>
              <th>Max HR</th>
              {isCycling ? (
                <>
                  <th>Avg Watts</th>
                  <th>Weighted Power</th>
                  <th>Normalized Power</th>
                </>
              ) : (
                <>
                  <th>Cadence</th>
                  <th>Pace Zone</th>
                </>
              )}
            </tr>
          </thead>

          <tbody>
            {splitRows.map((lap, index) => (
              <tr key={`${lap.id || lap.split || index}-${lap.elapsed_time}`}>
                <td data-label="Split">{getSplitLabel(lap, index)}</td>
                <td data-label="Distance">{getKmsToMiles(lap.distance)}</td>
                <td data-label="Elevation">{getSplitElevation(lap)}</td>
                <td data-label="Elapsed">{getSecondstoMinutes(lap.elapsed_time)}</td>
                <td data-label="Speed">{getMstoKmHr(lap?.average_speed)}</td>
                <td data-label="Avg HR">{lap.average_heartrate || '—'}</td>
                <td data-label="Max HR">{lap.max_heartrate || '—'}</td>
                {isCycling ? (
                  <>
                    <td data-label="Avg Watts">
                      {getAverageWatts(lap, detailedActivity)}
                    </td>
                    <td data-label="Weighted Power">
                      {getWeightedAveragePower(lap, detailedActivity)}
                    </td>
                    <td data-label="Normalized Power">
                      {getNormalizedPower(lap, detailedActivity)}
                    </td>
                  </>
                ) : (
                  <>
                    <td data-label="Cadence">{lap.average_cadence || '—'}</td>
                    <td data-label="Pace Zone">{lap.pace_zone || '—'}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </ResponsiveTable>
      </ResponsiveSection>

      <ResponsiveSection>
        <SectionTitle>Segment Efforts</SectionTitle>

        <ResponsiveTable>
          <thead>
            <tr>
              <th>Name</th>
              <th>Distance</th>
              <th>Elevation</th>
              <th>Elapsed</th>
              <th>Avg HR</th>
              <th>Max HR</th>
              {isCycling ? (
                <>
                  <th>Avg Watts</th>
                  <th>Weighted Power</th>
                  <th>Normalized Power</th>
                </>
              ) : (
                <>
                  <th>Max Grade</th>
                  <th>Average Grade</th>
                </>
              )}
            </tr>
          </thead>

          <tbody>
            {segmentEfforts.map((segment) => (
              <tr key={`${segment.id}-${segment.elapsed_time}`}>
                <td data-label="Name">{segment.name}</td>
                <td data-label="Distance">{getSegmentDistance(segment)}</td>
                <td data-label="Elevation">{getSegmentElevation(segment)}</td>
                <td data-label="Elapsed">{getSecondstoMinutes(segment.elapsed_time)}</td>
                <td data-label="Avg HR">{segment.average_heartrate || '—'}</td>
                <td data-label="Max HR">{segment.max_heartrate || '—'}</td>
                {isCycling ? (
                  <>
                    <td data-label="Avg Watts">
                      {getAverageWatts(segment, detailedActivity)}
                    </td>
                    <td data-label="Weighted Power">
                      {getWeightedAveragePower(segment, detailedActivity)}
                    </td>
                    <td data-label="Normalized Power">
                      {getNormalizedPower(segment, detailedActivity)}
                    </td>
                  </>
                ) : (
                  <>
                    <td data-label="Max Grade">{getSegmentMaxGrade(segment)}</td>
                    <td data-label="Average Grade">{getSegmentAverageGrade(segment)}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </ResponsiveTable>
      </ResponsiveSection>
    </PageContainer>
  );
}

const PageContainer = styled.div`
  min-height: 100vh;
  margin-top: 0;
  padding: 1.5rem;
  padding-top: 5.25rem;
  background:
    radial-gradient(circle at top left, rgba(252, 82, 0, 0.12), transparent 32%),
    linear-gradient(180deg, #0f1720 0%, #111820 45%, #171f29 100%);
  color: #fff;

  @media screen and (max-width: 700px) {
    padding: 1rem;
    padding-top: 4.35rem;
  }
`;

const HeaderCard = styled.div`
  background: #171f29;
  border: 1px solid #26313d;
  border-radius: 16px;
  padding: 1rem 1.25rem;
  margin-bottom: 1.25rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.22);
`;

const HeaderContent = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  min-width: 0;

  @media screen and (max-width: 600px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const ActivityTitle = styled.h1`
  margin: 0;
  color: #fff;
  font-size: clamp(1.2rem, 3vw, 2rem);
  min-width: 0;
  overflow-wrap: anywhere;
`;

const BackButton = styled.button`
  flex: 0 0 auto;
  background: #fc5200;
  color: #fff;
  border: solid;
  border-radius: 999px;
  border-color: ghostwhite;
  padding: 0.75rem 2.5rem;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    filter: brightness(1.25);
  }

  @media screen and (max-width: 600px) {
    border-radius: 999px;
    padding: 0.5rem 1.75rem;
  }
`;

const ChartsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  margin-bottom: 1.25rem;
  min-width: 0;

  @media screen and (max-width: 950px) {
    grid-template-columns: 1fr;
  }
`;

const ChartCard = styled.section`
  background: #ffffff;
  border: 1px solid #26313d;
  border-radius: 16px;
  padding: 1rem;
  min-height: 360px;
  min-width: 0;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.22);

  @media screen and (max-width: 700px) {
    min-height: 300px;
    padding: 0.75rem;
    border-radius: 12px;
  }

  @media screen and (max-width: 420px) {
    min-height: 280px;
    padding: 0.6rem;
  }
`;

const DarkChartCard = styled(ChartCard)`
  background: #0b100d;
  border-color: #26372d;
`;

const ChartHeading = styled.h2`
  margin: 0 0 1rem;
  color: #111;
  font-size: 1rem;
`;

const DarkChartHeading = styled(ChartHeading)`
  color: #eef3ee;
`;

const DetailLoading = styled.div`
  min-height: 300px;
  display: grid;
  place-items: center;
  padding: 1rem;
  box-sizing: border-box;
  color: #111827;
  text-align: center;
  font-weight: 700;
`;

const DarkDetailLoading = styled(DetailLoading)`
  color: #aab7af;
`;

const ResponsiveSection = styled.section`
  background: #171f29;
  border: 1px solid #26313d;
  border-radius: 16px;
  padding: 1rem;
  margin-bottom: 1.25rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.22);
  overflow-x: auto;
`;

const SectionTitle = styled.h2`
  color: #fff;
  margin: 0 0 1rem;
  font-size: 1.1rem;
`;

const ResponsiveTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  color: #d7dde6;

  thead {
    background: #111820;
  }

  th,
  td {
    padding: 0.85rem;
    border-bottom: 1px solid #26313d;
    text-align: left;
  }

  th {
    color: #fff;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  tbody tr:hover {
    background: #1f2a36;
  }

  @media screen and (max-width: 768px) {
    border-collapse: separate;
    border-spacing: 0 0.75rem;

    thead {
      display: none;
    }

    tr {
      display: block;
      background: #111820;
      border: 1px solid #26313d;
      border-radius: 14px;
      padding: 0.75rem;
    }

    td {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      border-bottom: 1px solid #26313d;
      padding: 0.65rem 0;
      font-size: 0.9rem;
    }

    td:last-child {
      border-bottom: none;
    }

    td::before {
      content: attr(data-label);
      color: #9aa4b2;
      font-weight: 700;
    }
  }
`;

const ScrollToTop = styled(ArrowUpCircleFill)`
  height: 3em;
  display: flex;
  z-index: 1000;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  position: fixed;
  opacity: 0.7;
  color: ${(props) => props.theme.colour.strava};
  margin: 60px 0px 200px 90vw;

  @media screen and (max-width: 750px) {
    right: 2rem;
    bottom: -8rem;
  }
`;
