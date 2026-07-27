import { summarizeGradeAdjustedEffort } from './gradeAdjustedEffort';
import { isCyclingActivity, isRunningActivity } from './activityTypes';

const METRIC_CACHE_PREFIX = 'performance-effort-v1-';
const STREAM_CACHE_PREFIX = 'activity-streams-';

export const getActivityStartDate = (activity) => {
  const rawDate = activity?.start_date ?? activity?.start_date_local;

  if (rawDate === null || rawDate === undefined || rawDate === '') {
    return null;
  }

  const normalizedDate =
    typeof rawDate === 'number' && rawDate < 1000000000000
      ? rawDate * 1000
      : rawDate;
  const activityDate = new Date(normalizedDate);

  return Number.isNaN(activityDate.getTime()) ? null : activityDate;
};

const shiftUtcMonths = (date, monthCount) => {
  const shiftedDate = new Date(date);
  const dayOfMonth = shiftedDate.getUTCDate();

  shiftedDate.setUTCDate(1);
  shiftedDate.setUTCMonth(shiftedDate.getUTCMonth() + monthCount);

  const lastDayOfMonth = new Date(
    Date.UTC(shiftedDate.getUTCFullYear(), shiftedDate.getUTCMonth() + 1, 0),
  ).getUTCDate();

  shiftedDate.setUTCDate(Math.min(dayOfMonth, lastDayOfMonth));

  return shiftedDate;
};

export const getRollingSixMonthRange = (referenceDate = new Date()) => {
  const rangeEnd = new Date(referenceDate);

  if (Number.isNaN(rangeEnd.getTime())) {
    return null;
  }

  rangeEnd.setUTCHours(23, 59, 59, 999);
  const rangeStart = shiftUtcMonths(rangeEnd, -6);
  rangeStart.setUTCHours(0, 0, 0, 0);

  return { rangeStart, rangeEnd };
};

export const getRollingSixMonthActivities = (
  activities = [],
  referenceDate = new Date(),
) => {
  const range = getRollingSixMonthRange(referenceDate);

  if (!range) {
    return [];
  }

  return (Array.isArray(activities) ? activities : [])
    .filter((activity) => {
      const activityDate = getActivityStartDate(activity);

      return (
        activityDate &&
        activityDate >= range.rangeStart &&
        activityDate <= range.rangeEnd
      );
    })
    .sort((first, second) => {
      return getActivityStartDate(first) - getActivityStartDate(second);
    });
};

const formatPeriodDate = (date) =>
  date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });

export const getRollingSixMonthPeriods = (referenceDate = new Date()) => {
  const range = getRollingSixMonthRange(referenceDate);

  if (!range) {
    return [];
  }

  return Array.from({ length: 6 }, (_, index) => {
    const start = shiftUtcMonths(range.rangeStart, index);
    const nextStart = shiftUtcMonths(range.rangeStart, index + 1);
    const end =
      index === 5
        ? new Date(range.rangeEnd)
        : new Date(nextStart.getTime() - 1);

    return {
      start,
      end,
      label: `${formatPeriodDate(start)} - ${formatPeriodDate(end)}`,
    };
  });
};

export const selectBalancedStreamActivities = (
  activities,
  referenceDate = new Date(),
  activitiesPerPeriod = 3,
) => {
  const sampleSize = Math.max(1, activitiesPerPeriod);
  const recentActivities = getRollingSixMonthActivities(activities, referenceDate).filter(
    (activity) => isRunningActivity(activity) || isCyclingActivity(activity),
  );
  const periods = getRollingSixMonthPeriods(referenceDate);

  return periods.flatMap((period) => {
    const periodActivities = recentActivities.filter((activity) => {
      const activityDate = getActivityStartDate(activity);

      return activity?.id && activityDate >= period.start && activityDate <= period.end;
    });

    if (periodActivities.length <= sampleSize) {
      return periodActivities;
    }

    if (sampleSize === 1) {
      return [periodActivities[Math.floor(periodActivities.length / 2)]];
    }

    return Array.from({ length: sampleSize }, (_, index) => {
      const activityIndex = Math.round(
        (index * (periodActivities.length - 1)) / (sampleSize - 1),
      );

      return periodActivities[activityIndex];
    });
  });
};

export const buildPerformancePeriods = (
  activities,
  metricsByActivity = {},
  referenceDate = new Date(),
) => {
  const recentActivities = getRollingSixMonthActivities(activities, referenceDate);

  return getRollingSixMonthPeriods(referenceDate).map((period) => {
    const periodMetrics = recentActivities
      .filter((activity) => {
        const activityDate = getActivityStartDate(activity);

        return activityDate >= period.start && activityDate <= period.end;
      })
      .map((activity) => ({
        activity,
        metric: metricsByActivity[activity.id],
      }))
      .filter(({ metric }) => metric?.effort !== null && metric?.effort !== undefined);
    const totalWeight = periodMetrics.reduce((sum, { activity }) => {
      return sum + Math.max(Number(activity.distance) || 0, 1);
    }, 0);
    const weightedAverage = (key) => {
      const values = periodMetrics.filter(({ metric }) => Number.isFinite(metric[key]));
      const valueWeight = values.reduce((sum, { activity }) => {
        return sum + Math.max(Number(activity.distance) || 0, 1);
      }, 0);

      if (!values.length || !valueWeight) {
        return null;
      }

      const weightedTotal = values.reduce((sum, { activity, metric }) => {
        return sum + metric[key] * Math.max(Number(activity.distance) || 0, 1);
      }, 0);

      return Number((weightedTotal / valueWeight).toFixed(1));
    };

    return {
      ...period,
      effort: totalWeight ? weightedAverage('effort') : null,
      climbingShare: weightedAverage('climbingShare'),
      averageClimbingGrade: weightedAverage('averageClimbingGrade'),
      averageHeartRate: weightedAverage('averageHeartRate'),
      elevationGain: Number(
        periodMetrics
          .reduce((sum, { metric }) => sum + (metric.elevationGain || 0), 0)
          .toFixed(1),
      ),
      activityCount: periodMetrics.length,
    };
  });
};

const readStoredJson = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch (error) {
    return null;
  }
};

export const getCachedPerformanceMetric = (activity) => {
  if (!activity?.id) {
    return null;
  }

  const cachedMetric = readStoredJson(`${METRIC_CACHE_PREFIX}${activity.id}`);

  if (cachedMetric?.effort !== undefined) {
    return cachedMetric;
  }

  const cachedStreams = readStoredJson(`${STREAM_CACHE_PREFIX}${activity.id}`);

  return cachedStreams
    ? summarizeGradeAdjustedEffort(cachedStreams, activity)
    : null;
};

export const storePerformanceMetric = (activityId, metric) => {
  if (!activityId || !metric) {
    return;
  }

  try {
    localStorage.setItem(
      `${METRIC_CACHE_PREFIX}${activityId}`,
      JSON.stringify(metric),
    );
  } catch (error) {
    console.warn(`Performance metric cache skipped for ${activityId}: ${error.message}`);
  }
};

export const getCachedPerformanceMetrics = (activities) => {
  return (Array.isArray(activities) ? activities : []).reduce(
    (metrics, activity) => {
      const metric = getCachedPerformanceMetric(activity);

      return metric ? { ...metrics, [activity.id]: metric } : metrics;
    },
    {},
  );
};
