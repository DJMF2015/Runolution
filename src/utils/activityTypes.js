const getActivityType = (activity) => {
  return String(activity?.sport_type || activity?.type || '').toLowerCase();
};

const POWER_KEYS = [
  'average_watts',
  'watts',
  'weighted_average_watts',
  'weighted_average_power',
  'normalized_power',
  'normalized_power_watts',
  'normalized_watts',
  'np',
];

const hasPowerMetric = (value) => {
  const power = Number(value);
  return Number.isFinite(power) && power > 0;
};

const hasPowerData = (row) => {
  return POWER_KEYS.some((key) => hasPowerMetric(row?.[key] ?? row?.segment?.[key]));
};

export const isRunningActivity = (activity) => {
  return ['run', 'virtualrun', 'trailrun'].includes(getActivityType(activity));
};

export const isCyclingActivity = (activity) => {
  return [
    'ride',
    'virtualride',
    'ebikeride',
    'mountainbikeride',
    'gravelride',
  ].includes(getActivityType(activity));
};

export const hasCyclingPowerData = (activity) => {
  return Boolean(
    activity &&
      (hasPowerData(activity) ||
        activity.laps?.some(hasPowerData) ||
        activity.splits_standard?.some(hasPowerData) ||
        activity.splits_metric?.some(hasPowerData) ||
        activity.segment_efforts?.some(hasPowerData)),
  );
};

export { getActivityType };
