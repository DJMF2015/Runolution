import React, { useMemo } from 'react';
import styled from 'styled-components';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { buildPerformancePeriods } from '../utils/performanceMetrics';

export {
  getActivityStartDate,
  getRollingSixMonthActivities,
} from '../utils/performanceMetrics';

const EFFORT_BASELINE = 100;
const EFFORT_COLOR = '#ff6b35';
const CLIMBING_COLOR = '#42d3c9';

const getEffortDomain = (periods) => {
  const effortValues = periods.map((period) => period.effort).filter(Number.isFinite);

  if (!effortValues.length) {
    return [80, 130];
  }

  const minimum = Math.min(EFFORT_BASELINE, ...effortValues);
  const maximum = Math.max(EFFORT_BASELINE, ...effortValues);

  return [
    Math.max(0, Math.floor((minimum - 8) / 10) * 10),
    Math.ceil((maximum + 8) / 10) * 10,
  ];
};

const getShortPeriodLabel = (label) => label.split(' - ')[0];

const PerformanceTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) {
    return null;
  }

  const period = payload[0].payload;

  return (
    <TooltipPanel>
      <TooltipPeriod>{period.label}</TooltipPeriod>
      <TooltipMetric>
        <TooltipMetricLabel>
          <TooltipSwatch $color={EFFORT_COLOR} />
          Effort index
        </TooltipMetricLabel>
        <strong>{Number.isFinite(period.effort) ? period.effort : 'No data'}</strong>
      </TooltipMetric>
      <TooltipMetric>
        <TooltipMetricLabel>
          <TooltipSwatch $color={CLIMBING_COLOR} />
          Climbing share
        </TooltipMetricLabel>
        <strong>
          {Number.isFinite(period.climbingShare) ? `${period.climbingShare}%` : 'No data'}
        </strong>
      </TooltipMetric>
      {period.activityCount > 0 && (
        <TooltipDetails>
          <span>{period.activityCount} streamed activities</span>
          <span>Average climbing grade: {period.averageClimbingGrade}%</span>
          <span>Elevation gain sampled: {Math.round(period.elevationGain)} m</span>
          {period.averageHeartRate && (
            <span>Average heart rate: {Math.round(period.averageHeartRate)} bpm</span>
          )}
        </TooltipDetails>
      )}
    </TooltipPanel>
  );
};

const StravaMetricsChart = ({
  activities = [],
  error,
  isLoading = false,
  metricsByActivity = {},
  referenceDate = new Date(),
}) => {
  const referenceTime = new Date(referenceDate).getTime();
  const periods = useMemo(
    () => buildPerformancePeriods(activities, metricsByActivity, new Date(referenceTime)),
    [activities, metricsByActivity, referenceTime],
  );
  const chartData = useMemo(
    () =>
      periods.map((period) => ({
        ...period,
        shortLabel: getShortPeriodLabel(period.label),
      })),
    [periods],
  );
  const effortDomain = useMemo(() => getEffortDomain(periods), [periods]);
  const populatedPeriods = periods.filter((period) => Number.isFinite(period.effort));
  const latestPeriod = populatedPeriods[populatedPeriods.length - 1];
  const streamedActivityCount = populatedPeriods.reduce(
    (total, period) => total + period.activityCount,
    0,
  );

  return (
    <ChartCard data-testid="performance-card">
      <ChartHeader>
        <div>
          <Eyebrow>GRADE-ADJUSTED STREAM ANALYSIS</Eyebrow>
          <ChartTitle>Performance Over Time</ChartTitle>
        </div>
        <ChartSubtitle>
          Terrain, pace and heart-rate load across the latest six months
        </ChartSubtitle>
      </ChartHeader>

      {populatedPeriods.length > 0 && (
        <Summary>
          <SummaryItem>
            <SummaryLabel>Latest effort</SummaryLabel>
            <SummaryValue>{latestPeriod.effort}</SummaryValue>
          </SummaryItem>
          <SummaryItem>
            <SummaryLabel>Climbing share</SummaryLabel>
            <SummaryValue>{latestPeriod.climbingShare ?? 0}%</SummaryValue>
          </SummaryItem>
          <SummaryItem>
            <SummaryLabel>Streamed activities</SummaryLabel>
            <SummaryValue>{streamedActivityCount}</SummaryValue>
          </SummaryItem>
        </Summary>
      )}

      <ChartFrame
        data-testid="performance-chart"
        data-period-count={periods.length}
        data-populated-count={populatedPeriods.length}
      >
        {populatedPeriods.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              accessibilityLayer
              data={chartData}
              margin={{ top: 8, right: 10, bottom: 2, left: 4 }}
            >
              <defs>
                <linearGradient id="effortArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={EFFORT_COLOR} stopOpacity={0.48} />
                  <stop offset="100%" stopColor={EFFORT_COLOR} stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid
                stroke="rgba(148, 163, 184, 0.16)"
                strokeDasharray="3 5"
                vertical={false}
              />
              <XAxis
                dataKey="shortLabel"
                axisLine={{ stroke: 'rgba(203, 213, 225, 0.35)' }}
                tick={{ fill: '#b8c4ce', fontSize: 11, fontWeight: 600 }}
                tickLine={false}
                tickMargin={10}
                minTickGap={14}
              />
              <YAxis
                yAxisId="effort"
                domain={effortDomain}
                tickCount={5}
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#b8c4ce', fontSize: 11 }}
                tickMargin={8}
                width={56}
                label={{
                  value: 'Effort index',
                  angle: -90,
                  position: 'insideLeft',
                  fill: '#94a3b8',
                  fontSize: 10,
                }}
              />
              <YAxis
                yAxisId="climbing"
                orientation="right"
                domain={[0, 100]}
                tickCount={5}
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `${value}%`}
                tick={{ fill: '#b8c4ce', fontSize: 11 }}
                tickMargin={8}
                width={60}
                label={{
                  value: 'Climbing share',
                  angle: 90,
                  position: 'insideRight',
                  fill: '#94a3b8',
                  fontSize: 10,
                }}
              />
              <Tooltip content={<PerformanceTooltip />} cursor={{ fill: '#ffffff08' }} />
              <Legend
                align="center"
                verticalAlign="top"
                height={34}
                iconSize={9}
                wrapperStyle={{ color: '#dbe5ed', fontSize: 11, fontWeight: 600 }}
              />
              <ReferenceLine
                yAxisId="effort"
                y={EFFORT_BASELINE}
                stroke="rgba(226, 232, 240, 0.45)"
                strokeDasharray="5 5"
                label={{
                  value: 'Baseline 100',
                  position: 'insideTopLeft',
                  fill: '#aab7c2',
                  fontSize: 10,
                }}
              />
              <Area
                yAxisId="effort"
                type="monotone"
                dataKey="effort"
                name="Grade-adjusted effort"
                stroke={EFFORT_COLOR}
                strokeWidth={3}
                fill="url(#effortArea)"
                connectNulls
                activeDot={{
                  r: 5,
                  fill: EFFORT_COLOR,
                  stroke: '#071018',
                  strokeWidth: 2,
                }}
                animationDuration={650}
              />
              <Line
                yAxisId="climbing"
                type="monotone"
                dataKey="climbingShare"
                name="Climbing share"
                stroke={CLIMBING_COLOR}
                strokeWidth={2.5}
                connectNulls
                dot={{ r: 3, fill: '#071018', stroke: CLIMBING_COLOR, strokeWidth: 2 }}
                activeDot={{
                  r: 5,
                  fill: CLIMBING_COLOR,
                  stroke: '#071018',
                  strokeWidth: 2,
                }}
                animationDuration={650}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState>
            {isLoading
              ? 'Analysing grade-related activity streams...'
              : error || 'No grade-related stream data is available yet.'}
          </EmptyState>
        )}
      </ChartFrame>
      {isLoading && populatedPeriods.length > 0 && (
        <LoadingNote>Updating with additional activity streams...</LoadingNote>
      )}
    </ChartCard>
  );
};

const ChartCard = styled.section`
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  overflow: hidden;
  padding: 1.05rem 1.15rem 0.9rem;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 8px;
  background: #111827c7;
  box-shadow: 0 14px 32px rgba(0, 0, 0, 0.24);

  @media screen and (max-width: 699px) {
    display: none;
  }
`;

const ChartHeader = styled.header`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1.25rem;
  margin-bottom: 0.75rem;

  @media screen and (max-width: 840px) {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.3rem;
  }
`;

const Eyebrow = styled.span`
  display: block;
  margin-bottom: 0.2rem;
  color: #ff7a45;
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0;
`;

const ChartTitle = styled.h3`
  margin: 0;
  color: #f8fafc;
  font-size: 1.12rem;
  font-weight: 800;
  letter-spacing: 0;
`;

const ChartSubtitle = styled.p`
  max-width: 27rem;
  margin: 0;
  color: #9fadb9;
  font-size: 0.75rem;
  line-height: 1.4;
  text-align: right;

  @media screen and (max-width: 840px) {
    max-width: none;
    text-align: left;
  }
`;

const Summary = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1.65rem;
  margin-bottom: 0.6rem;
  padding-bottom: 0.65rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.16);
`;

const SummaryItem = styled.div`
  min-width: 6.5rem;
`;

const SummaryLabel = styled.span`
  display: block;
  margin-bottom: 0.05rem;
  color: #94a3b8;
  font-size: 0.65rem;
  font-weight: 700;
`;

const SummaryValue = styled.strong`
  color: #f8fafc;
  font-size: 1rem;
  font-weight: 800;
`;

const ChartFrame = styled.div`
  position: relative;
  width: 100%;
  min-width: 0;
  height: clamp(230px, 27vw, 300px);
`;

const EmptyState = styled.div`
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  color: #aab7c2;
  font-size: 0.82rem;
  text-align: center;
`;

const LoadingNote = styled.p`
  margin: 0.25rem 0 0;
  color: #94a3b8;
  font-size: 0.7rem;
`;

const TooltipPanel = styled.div`
  min-width: 13rem;
  padding: 0.7rem 0.75rem;
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 6px;
  background: rgba(5, 12, 18, 0.97);
  color: #e2e8f0;
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.38);
`;

const TooltipPeriod = styled.strong`
  display: block;
  margin-bottom: 0.55rem;
  color: #ffffff;
  font-size: 0.76rem;
`;

const TooltipMetric = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 0.3rem;
  font-size: 0.72rem;
`;

const TooltipMetricLabel = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: #cbd5e1;
`;

const TooltipSwatch = styled.span`
  width: 0.45rem;
  height: 0.45rem;
  flex: 0 0 0.45rem;
  border-radius: 50%;
  background: ${(props) => props.$color};
`;

const TooltipDetails = styled.div`
  display: grid;
  gap: 0.15rem;
  margin-top: 0.6rem;
  padding-top: 0.5rem;
  border-top: 1px solid rgba(148, 163, 184, 0.2);
  color: #9fadb9;
  font-size: 0.67rem;
`;

export default StravaMetricsChart;
