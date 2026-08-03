import React, { useState } from 'react';
import styled from 'styled-components';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getGradeAdjustedEffort, getStreamData } from '../utils/gradeAdjustedEffort';

const METRES_PER_KM = 1000;
const MAX_PROFILE_POINTS = 260;
const ELEVATION_COLOR = '#8fd6a8';
const EFFORT_COLOR = '#f08b67';

const toNumber = (value, fallback = null) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const getAverage = (values) => {
  const numericValues = values.filter((value) => Number.isFinite(value));

  if (!numericValues.length) {
    return null;
  }

  return numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length;
};

const getAxisRange = (values, fallbackMax = 100) => {
  const numericValues = values.filter((value) => Number.isFinite(value));

  if (!numericValues.length) {
    return [0, fallbackMax];
  }

  const minimum = Math.min(...numericValues);
  const maximum = Math.max(...numericValues);
  const spread = Math.max(maximum - minimum, 10);
  const padding = spread * 0.12;

  return [Math.floor(minimum - padding), Math.ceil(maximum + padding)];
};

const getPerformancePoint = (velocity, isCycling) => {
  if (!Number.isFinite(velocity) || velocity <= 0) {
    return null;
  }

  if (isCycling) {
    return Number((velocity * 3.6).toFixed(1));
  }

  return Number((METRES_PER_KM / (velocity * 60)).toFixed(2));
};

export const getProfilePoints = (streams, isCycling = false) => {
  const altitudeStream = getStreamData(streams, 'altitude');
  const distanceStream = getStreamData(streams, 'distance');
  const heartRateStream = getStreamData(streams, 'heartrate');
  const velocityStream = getStreamData(streams, 'velocity_smooth');
  const gradeStream = getStreamData(streams, 'grade_smooth');
  const sampleStep = Math.max(1, Math.ceil(altitudeStream.length / MAX_PROFILE_POINTS));
  const averageHeartRate = getAverage(heartRateStream.map((value) => toNumber(value)));
  const averageVelocity = getAverage(velocityStream.map((value) => toNumber(value)));
  const points = [];

  altitudeStream.forEach((altitude, index) => {
    if (index % sampleStep !== 0 && index !== altitudeStream.length - 1) {
      return;
    }

    const altitudeMetres = toNumber(altitude);

    if (altitudeMetres === null) {
      return;
    }

    const previousPoint = points[points.length - 1];
    const distanceMetres = toNumber(distanceStream[index]);
    const distanceKm =
      distanceMetres !== null ? distanceMetres / METRES_PER_KM : index / sampleStep;
    const elevationDifference = previousPoint
      ? altitudeMetres - previousPoint.altitude
      : 0;
    const distanceDeltaMetres = previousPoint
      ? Math.max((distanceKm - previousPoint.distanceKm) * METRES_PER_KM, 1)
      : 1;
    const heartRate = toNumber(heartRateStream[index]);
    const velocity = toNumber(velocityStream[index]);

    points.push({
      altitude: altitudeMetres,
      distanceKm: Number(distanceKm.toFixed(3)),
      gradeAdjustedEffort: getGradeAdjustedEffort({
        averageHeartRate,
        averageVelocity,
        distanceDeltaMetres,
        elevationDifference,
        gradePercent: toNumber(gradeStream[index]),
        heartRate,
        velocity,
      }),
      heartRate,
      performance: getPerformancePoint(velocity, isCycling),
      velocity,
    });
  });

  return points;
};

const formatPace = (pace) => {
  if (!Number.isFinite(pace)) {
    return null;
  }

  const totalSeconds = Math.round(pace * 60);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, '0')} /km`;
};

const ProfileTooltip = ({ active, payload, isCycling }) => {
  if (!active || !payload?.length) {
    return null;
  }

  const point = payload[0]?.payload;

  if (!point) {
    return null;
  }

  const performance = Number.isFinite(point.performance)
    ? isCycling
      ? `${point.performance.toFixed(1)} km/h`
      : formatPace(point.performance)
    : null;

  return (
    <TooltipPanel>
      <TooltipPosition>{point.distanceKm.toFixed(2)} km</TooltipPosition>
      <TooltipValue $color={ELEVATION_COLOR}>
        Elevation: {Math.round(point.altitude)} m
      </TooltipValue>
      <TooltipValue $color={EFFORT_COLOR}>
        Grade adjusted effort: {point.gradeAdjustedEffort}
      </TooltipValue>
      {Number.isFinite(point.heartRate) && (
        <TooltipMeta>Heart rate: {Math.round(point.heartRate)} bpm</TooltipMeta>
      )}
      {performance && (
        <TooltipMeta>
          {isCycling ? 'Speed' : 'Pace'}: {performance}
        </TooltipMeta>
      )}
    </TooltipPanel>
  );
};

export default function ElevationBarChart({
  streams,
  isLoading,
  error,
  isCycling = false,
}) {
  const [visibleSeries, setVisibleSeries] = useState({
    elevation: true,
    gradeEffort: true,
  });
  const profilePoints = getProfilePoints(streams, isCycling);
  const hasProfile = profilePoints.length > 0;
  const toggleSeries = (series) => {
    setVisibleSeries((current) => ({
      ...current,
      [series]: !current[series],
    }));
  };

  if (!hasProfile) {
    return (
      <ChartPanel>
        <ChartHeader>
          <ChartTitle>Elevation & Grade Adjusted Effort</ChartTitle>
        </ChartHeader>
        <EmptyChart>
          {isLoading
            ? 'Loading elevation profile...'
            : error || 'No detailed altitude stream data available for this activity.'}
        </EmptyChart>
      </ChartPanel>
    );
  }

  const altitudeDomain = getAxisRange(
    profilePoints.map((point) => point.altitude),
    100,
  );
  const effortDomain = getAxisRange(
    profilePoints.map((point) => point.gradeAdjustedEffort),
    120,
  );

  return (
    <ChartPanel>
      <ChartHeader>
        <ChartTitle>Elevation & Grade Adjusted Effort</ChartTitle>
        <ChartLegend aria-label="Chart series">
          <LegendButton
            type="button"
            aria-pressed={visibleSeries.elevation}
            $active={visibleSeries.elevation}
            $color={ELEVATION_COLOR}
            onClick={() => toggleSeries('elevation')}
          >
            <LegendSwatch $color={ELEVATION_COLOR} />
            Elevation
          </LegendButton>
          <LegendButton
            type="button"
            aria-pressed={visibleSeries.gradeEffort}
            $active={visibleSeries.gradeEffort}
            $color={EFFORT_COLOR}
            onClick={() => toggleSeries('gradeEffort')}
          >
            <LegendSwatch $color={EFFORT_COLOR} />
            Grade effort
          </LegendButton>
        </ChartLegend>
      </ChartHeader>
      <ChartSubtitle>
        Compare elevation and grade-adjusted effort by distance
      </ChartSubtitle>
      <ChartWrapper>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={profilePoints}
            margin={{ top: 12, right: 2, left: 0, bottom: 20 }}
            accessibilityLayer
            aria-label="Elevation and grade adjusted effort by distance"
          >
            <defs>
              <linearGradient id="effortElevationFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ELEVATION_COLOR} stopOpacity={0.4} />
                <stop offset="100%" stopColor={ELEVATION_COLOR} stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#29372f" strokeDasharray="2 4" vertical={false} />
            <XAxis
              dataKey="distanceKm"
              type="number"
              domain={['dataMin', 'dataMax']}
              stroke="#819087"
              tick={{ fill: '#9aa89f', fontSize: 11 }}
              tickFormatter={(distance) => Number(distance).toFixed(1)}
              tickLine={false}
              minTickGap={24}
              label={{
                value: 'Distance (km)',
                position: 'insideBottom',
                offset: -12,
                fill: '#9aa89f',
                fontSize: 11,
              }}
            />
            <YAxis
              yAxisId="elevation"
              domain={altitudeDomain}
              stroke={ELEVATION_COLOR}
              tick={{ fill: ELEVATION_COLOR, fontSize: 10 }}
              tickLine={false}
              tickCount={5}
              width={42}
              unit="m"
            />
            <YAxis
              yAxisId="effort"
              orientation="right"
              domain={[Math.max(0, effortDomain[0]), effortDomain[1]]}
              stroke={EFFORT_COLOR}
              tick={{ fill: EFFORT_COLOR, fontSize: 10 }}
              tickLine={false}
              tickCount={5}
              width={36}
            />
            <Tooltip
              content={<ProfileTooltip isCycling={isCycling} />}
              cursor={{ stroke: '#aab8af', strokeDasharray: '3 3' }}
            />
            {visibleSeries.elevation && (
              <Area
                yAxisId="elevation"
                type="monotone"
                dataKey="altitude"
                name="Elevation"
                stroke={ELEVATION_COLOR}
                strokeWidth={2}
                fill="url(#effortElevationFill)"
                connectNulls
                isAnimationActive={false}
              />
            )}
            {visibleSeries.gradeEffort && (
              <Line
                yAxisId="effort"
                type="monotone"
                dataKey="gradeAdjustedEffort"
                name="Grade adjusted effort"
                stroke={EFFORT_COLOR}
                strokeWidth={2.5}
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
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.8rem;

  @media screen and (max-width: 460px) {
    align-items: flex-start;
    flex-direction: column;
  }
`;

const ChartTitle = styled.h3`
  margin: 0;
  color: #eef3ee;
  font-size: 0.9rem;
  line-height: 1.3;
`;

const ChartSubtitle = styled.p`
  max-width: 31rem;
  color: #aab7af;
  margin: 0;
  color: #aab7af;
  font-size: 0.78rem;
  line-height: 1.45;
`;

const ChartLegend = styled.div`
  display: flex;
  flex: 0 0 auto;
  margin-top: 1.5rem;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.65rem;

  @media screen and (max-width: 460px) {
    width: 100%;
    justify-content: flex-start;
  }
`;

const LegendButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 30px;
  border-radius: 8px;
  border: 1px solid ${({ $active, $color }) => ($active ? $color : '#3a4d42')};
  padding: 0.4rem 0.6rem;
  background: ${({ $active, $color }) =>
    $active ? `${$color}18` : 'rgba(22, 34, 27, 0.55)'};
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

  @media screen and (max-width: 380px) {
    min-height: 28px;
    padding: 0.3rem 0.5rem;
    font-size: 0.65rem;
  }
`;

const LegendSwatch = styled.span`
  width: 12px;
  height: 3px;
  flex: 0 0 auto;
  border-radius: 2px;
  background: ${({ $color }) => $color};
`;

const ChartWrapper = styled.div`
  margin-top: 1.5rem;
  width: 100%;
  height: clamp(285px, 36vw, 360px);
  min-width: 0;
  overflow: hidden;
  border: 1px solid #26372d;
  border-radius: 8px;
  background: #111a15;

  @media screen and (max-width: 700px) {
    height: 315px;
  }

  @media screen and (max-width: 420px) {
    height: 295px;
  }
`;

const TooltipPanel = styled.div`
  min-width: 170px;
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

const TooltipMeta = styled.div`
  color: #c7d1cb;
  line-height: 1.55;
`;

const EmptyChart = styled.div`
  width: 100%;
  min-height: 285px;
  display: grid;
  place-items: center;
  padding: 1rem;
  box-sizing: border-box;
  border: 1px solid #26372d;
  border-radius: 8px;
  background: #111a15;
  color: #aab7af;
  text-align: center;

  @media screen and (max-width: 420px) {
    min-height: 260px;
  }
`;
