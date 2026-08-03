import { useMemo, useState } from 'react';
import styled from 'styled-components';
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getStreamData, toStreamNumber } from '../utils/gradeAdjustedEffort';

const MAX_CHART_POINTS = 250;
const HEART_RATE_COLOR = '#f08b67';
const PACE_COLOR = '#61b7e5';

const getSampleValue = (stream, index, sampleCount) => {
  if (!stream.length) {
    return null;
  }

  const streamIndex =
    sampleCount <= 1 ? 0 : Math.round((index / (sampleCount - 1)) * (stream.length - 1));

  return toStreamNumber(stream[streamIndex]);
};

const getSampleIndexes = (sampleCount, maxPoints) => {
  if (sampleCount <= maxPoints) {
    return Array.from({ length: sampleCount }, (_, index) => index);
  }

  return Array.from({ length: maxPoints }, (_, index) =>
    Math.round((index / (maxPoints - 1)) * (sampleCount - 1)),
  );
};

const getPaceMinutesPerKm = (velocity) => {
  if (!Number.isFinite(velocity) || velocity <= 0) {
    return null;
  }

  const pace = 1000 / (velocity * 60);

  return pace >= 0.5 && pace <= 30 ? Number(pace.toFixed(2)) : null;
};

export const buildActivityStreamChartData = (streams, maxPoints = MAX_CHART_POINTS) => {
  const distance = getStreamData(streams, 'distance');
  const heartRate = getStreamData(streams, 'heartrate');
  const time = getStreamData(streams, 'time');
  const velocity = getStreamData(streams, 'velocity_smooth');
  const sampleCount = Math.max(
    distance.length,
    heartRate.length,
    time.length,
    velocity.length,
  );

  if (!sampleCount) {
    return {
      data: [],
      xAxisLabel: 'Distance (km)',
      xValueSuffix: 'km',
    };
  }

  const usesDistance = distance.length > 0;
  const usesTime = !usesDistance && time.length > 0;
  const data = getSampleIndexes(sampleCount, maxPoints)
    .map((index) => {
      const distanceMetres = getSampleValue(distance, index, sampleCount);
      const elapsedSeconds = getSampleValue(time, index, sampleCount);
      const sampleVelocity = getSampleValue(velocity, index, sampleCount);
      const position = usesDistance
        ? distanceMetres / 1000
        : usesTime
          ? elapsedSeconds / 60
          : sampleCount === 1
            ? 0
            : (index / (sampleCount - 1)) * 100;

      return {
        position: Number(position.toFixed(2)),
        heartRate: getSampleValue(heartRate, index, sampleCount),
        pace: getPaceMinutesPerKm(sampleVelocity),
      };
    })
    .filter(
      (point) =>
        Number.isFinite(point.position) &&
        [point.heartRate, point.pace].some(Number.isFinite),
    );

  return {
    data,
    xAxisLabel: usesDistance
      ? 'Distance (km)'
      : usesTime
        ? 'Elapsed time (min)'
        : 'Activity progress (%)',
    xValueSuffix: usesDistance ? 'km' : usesTime ? 'min' : '%',
  };
};

const getAxisDomain = (values, fallback, minimumPadding) => {
  const numericValues = values.filter(Number.isFinite);

  if (!numericValues.length) {
    return fallback;
  }

  const minimum = Math.min(...numericValues);
  const maximum = Math.max(...numericValues);
  const padding = Math.max((maximum - minimum) * 0.1, minimumPadding);

  return [
    Math.max(0, Number((minimum - padding).toFixed(1))),
    Number((maximum + padding).toFixed(1)),
  ];
};

export const formatPace = (pace) => {
  if (!Number.isFinite(Number(pace))) {
    return '—';
  }

  const totalSeconds = Math.round(Number(pace) * 60);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

const StreamTooltip = ({ active, payload, xValueSuffix }) => {
  if (!active || !payload?.length) {
    return null;
  }

  const point = payload[0]?.payload;

  if (!point) {
    return null;
  }

  return (
    <TooltipPanel>
      <TooltipPosition>
        {point.position} {xValueSuffix}
      </TooltipPosition>
      {Number.isFinite(point.heartRate) && (
        <TooltipValue $color={HEART_RATE_COLOR}>
          Heart rate: {Math.round(point.heartRate)} bpm
        </TooltipValue>
      )}
      {Number.isFinite(point.pace) && (
        <TooltipValue $color={PACE_COLOR}>
          Pace: {formatPace(point.pace)} /km
        </TooltipValue>
      )}
    </TooltipPanel>
  );
};

const SeriesToggle = ({ active, color, disabled, label, onClick }) => (
  <ToggleButton
    type="button"
    aria-pressed={active}
    disabled={disabled}
    $active={active}
    $color={color}
    onClick={onClick}
  >
    <ToggleSwatch $color={color} />
    {label}
  </ToggleButton>
);

export default function ActivityStreamChart({ streams }) {
  const [visibleSeries, setVisibleSeries] = useState({
    elevation: true,
    heartRate: true,
    pace: true,
  });
  const { data, xAxisLabel, xValueSuffix } = useMemo(
    () => buildActivityStreamChartData(streams),
    [streams],
  );
  const availableSeries = {
    elevation: data.some((point) => Number.isFinite(point.elevation)),
    heartRate: data.some((point) => Number.isFinite(point.heartRate)),
    pace: data.some((point) => Number.isFinite(point.pace)),
  };

  if (!data.length) {
    return <EmptyChart>No activity stream data is available for this chart.</EmptyChart>;
  }

  const heartRateDomain = getAxisDomain(
    data.map((point) => point.heartRate),
    [80, 180],
    5,
  );
  const paceDomain = getAxisDomain(
    data.map((point) => point.pace),
    [3, 8],
    0.25,
  );
  const toggleSeries = (series) => {
    setVisibleSeries((current) => ({
      ...current,
      [series]: !current[series],
    }));
  };

  return (
    <ChartPanel>
      <ChartHeader>
        <ChartSubtitle>
          Compare cardiovascular response, and pace across the activity.
        </ChartSubtitle>
        <ToggleGroup aria-label="Chart series">
          <SeriesToggle
            active={visibleSeries.heartRate}
            color={HEART_RATE_COLOR}
            disabled={!availableSeries.heartRate}
            label="Heart rate"
            onClick={() => toggleSeries('heartRate')}
          />
          <SeriesToggle
            active={visibleSeries.pace}
            color={PACE_COLOR}
            disabled={!availableSeries.pace}
            label="Pace"
            onClick={() => toggleSeries('pace')}
          />
        </ToggleGroup>
      </ChartHeader>

      <ChartWrapper>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 12, right: 2, left: 0, bottom: 20 }}
            accessibilityLayer
            aria-label="Elevation heart rate and pace by distance"
          >
            <CartesianGrid stroke="#29372f" strokeDasharray="2 4" vertical={false} />
            <XAxis
              dataKey="position"
              type="number"
              domain={['dataMin', 'dataMax']}
              stroke="#819087"
              tick={{ fill: '#9aa89f', fontSize: 11 }}
              tickLine={false}
              minTickGap={24}
              label={{
                value: xAxisLabel,
                position: 'insideBottom',
                offset: -12,
                fill: '#9aa89f',
                fontSize: 11,
              }}
            />
            <YAxis
              yAxisId="heartRate"
              orientation="right"
              domain={heartRateDomain}
              stroke={HEART_RATE_COLOR}
              tick={{ fill: HEART_RATE_COLOR, fontSize: 10 }}
              tickLine={false}
              tickCount={5}
              width={42}
              unit="bpm"
            />
            <YAxis
              yAxisId="pace"
              orientation="right"
              domain={paceDomain}
              reversed
              stroke={PACE_COLOR}
              tick={{ fill: PACE_COLOR, fontSize: 10 }}
              tickFormatter={formatPace}
              tickLine={false}
              tickCount={5}
              width={38}
            />
            <Tooltip
              content={<StreamTooltip xValueSuffix={xValueSuffix} />}
              cursor={{ stroke: '#aab8af', strokeDasharray: '3 3' }}
            />
            {visibleSeries.heartRate && availableSeries.heartRate && (
              <Line
                yAxisId="heartRate"
                type="monotone"
                dataKey="heartRate"
                stroke={HEART_RATE_COLOR}
                strokeWidth={2}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            )}
            {visibleSeries.pace && availableSeries.pace && (
              <Line
                yAxisId="pace"
                type="monotone"
                dataKey="pace"
                stroke={PACE_COLOR}
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </ChartWrapper>
    </ChartPanel>
  );
}

const ChartPanel = styled.div`
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  color: #eef3ee;
`;

const ChartHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.8rem;

  @media screen and (max-width: 520px) {
    flex-direction: column;
  }
`;

const ChartSubtitle = styled.p`
  max-width: 31rem;
  margin: 0;
  color: #aab7af;
  font-size: 0.78rem;
  line-height: 1.45;
`;

const ToggleGroup = styled.div`
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.4rem;

  @media screen and (max-width: 520px) {
    width: 100%;
    justify-content: flex-start;
  }
`;

const ToggleButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-height: 30px;
  padding: 0.3rem 0.55rem;
  border: 1px solid ${({ $active, $color }) => ($active ? $color : '#3b4941')};
  border-radius: 999px;
  background: ${({ $active, $color }) => ($active ? `${$color}18` : 'transparent')};
  color: ${({ $active, $color }) => ($active ? $color : '#7f8c84')};
  font: inherit;
  font-size: 0.7rem;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid #ffffff;
    outline-offset: 2px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.35;
  }

  @media screen and (max-width: 380px) {
    min-height: 28px;
    padding: 0.25rem 0.42rem;
    font-size: 0.65rem;
  }
`;

const ToggleSwatch = styled.span`
  width: 7px;
  height: 7px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: ${({ $color }) => $color};
`;

const ChartWrapper = styled.div`
  width: 100%;
  height: clamp(300px, 38vw, 390px);
  min-width: 0;
  overflow: hidden;
  border: 1px solid #26372d;
  border-radius: 8px;
  background: #111a15;

  @media screen and (max-width: 700px) {
    height: 330px;
  }

  @media screen and (max-width: 420px) {
    height: 310px;
  }
`;

const TooltipPanel = styled.div`
  min-width: 150px;
  padding: 0.65rem 0.75rem;
  border: 1px solid #3a4d42;
  border-radius: 8px;
  background: rgba(22, 34, 27, 0.97);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.3);
  color: #eef3ee;
  font-size: 0.74rem;
`;

const TooltipPosition = styled.div`
  margin-bottom: 0.35rem;
  color: #aab7af;
`;

const TooltipValue = styled.div`
  color: ${({ $color }) => $color};
  line-height: 1.55;
`;

const EmptyChart = styled.div`
  width: 100%;
  min-height: 300px;
  display: grid;
  place-items: center;
  padding: 1rem;
  box-sizing: border-box;
  border: 1px solid #26372d;
  border-radius: 8px;
  background: #111a15;
  color: #aab7af;
  text-align: center;
`;
