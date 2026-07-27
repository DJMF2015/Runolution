import { isCyclingActivity } from './activityTypes';

const EFFORT_BASELINE = 100;
const HEART_RATE_BASELINE = 140;
const RUN_VELOCITY_BASELINE = 3;
const RIDE_VELOCITY_BASELINE = 7;
const EFFORT_WEIGHTS = {
  grade: 0.4,
  heartRate: 0.35,
  pace: 0.25,
};

export const toStreamNumber = (value, fallback = null) => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : fallback;
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export const getStreamData = (streams, key) => {
  if (Array.isArray(streams)) {
    return streams.find((stream) => stream?.type === key)?.data || [];
  }

  if (Array.isArray(streams?.[key])) {
    return streams[key];
  }

  if (Array.isArray(streams?.streams?.[key])) {
    return streams.streams[key];
  }

  return streams?.[key]?.data || streams?.streams?.[key]?.data || [];
};

const getAverage = (values) => {
  const numericValues = values.filter(Number.isFinite);

  if (!numericValues.length) {
    return null;
  }

  return numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length;
};

export const getGradeAdjustedEffort = ({
  averageHeartRate,
  averageVelocity,
  distanceDeltaMetres,
  elevationDifference,
  gradePercent,
  heartRate,
  paceDirection = 'slower',
  velocity,
}) => {
  const derivedGrade =
    (Math.max(toStreamNumber(elevationDifference, 0), 0) /
      Math.max(toStreamNumber(distanceDeltaMetres, 1), 1)) *
    100;
  const positiveGrade = Math.max(toStreamNumber(gradePercent, derivedGrade), 0);
  const gradeLoad = clamp(1 + positiveGrade / 10, 0.75, 2.25);
  const heartRateLoad =
    heartRate && averageHeartRate
      ? clamp(heartRate / averageHeartRate, 0.75, 1.5)
      : 1;
  const paceLoad =
    velocity && averageVelocity
      ? clamp(
          paceDirection === 'faster'
            ? velocity / averageVelocity
            : averageVelocity / velocity,
          0.75,
          1.5,
        )
      : 1;
  const weightedLoad =
    gradeLoad * EFFORT_WEIGHTS.grade +
    heartRateLoad * EFFORT_WEIGHTS.heartRate +
    paceLoad * EFFORT_WEIGHTS.pace;

  return Number((EFFORT_BASELINE * weightedLoad).toFixed(1));
};

export const summarizeGradeAdjustedEffort = (streams, activity = {}) => {
  const altitude = getStreamData(streams, 'altitude');
  const distance = getStreamData(streams, 'distance');
  const grade = getStreamData(streams, 'grade_smooth');
  const heartRate = getStreamData(streams, 'heartrate');
  const velocity = getStreamData(streams, 'velocity_smooth');
  const moving = getStreamData(streams, 'moving');
  const sampleCount = Math.max(
    altitude.length,
    distance.length,
    grade.length,
    heartRate.length,
    velocity.length,
  );
  const hasGradeSource = grade.length > 0 || (altitude.length > 1 && distance.length > 1);

  if (!sampleCount || !hasGradeSource) {
    return null;
  }

  const averageHeartRate =
    getAverage(heartRate.map((value) => toStreamNumber(value))) ??
    toStreamNumber(activity.average_heartrate);
  const averageVelocity =
    getAverage(
      velocity
        .map((value) => toStreamNumber(value))
        .filter((value) => value > 0),
    ) ?? toStreamNumber(activity.average_speed);
  const velocityBaseline = isCyclingActivity(activity)
    ? RIDE_VELOCITY_BASELINE
    : RUN_VELOCITY_BASELINE;
  const effortSamples = [];
  const gradeSamples = [];
  let elevationGain = 0;

  for (let index = 0; index < sampleCount; index += 1) {
    if (moving[index] === false) {
      continue;
    }

    const currentAltitude = toStreamNumber(altitude[index]);
    const previousAltitude = toStreamNumber(altitude[index - 1]);
    const currentDistance = toStreamNumber(distance[index]);
    const previousDistance = toStreamNumber(distance[index - 1]);
    const elevationDifference =
      currentAltitude !== null && previousAltitude !== null
        ? currentAltitude - previousAltitude
        : 0;
    const distanceDeltaMetres =
      currentDistance !== null && previousDistance !== null
        ? Math.max(currentDistance - previousDistance, 1)
        : 1;
    const derivedGrade = (elevationDifference / distanceDeltaMetres) * 100;
    const gradePercent = clamp(
      toStreamNumber(grade[index], derivedGrade),
      -25,
      35,
    );
    const sampleHeartRate = toStreamNumber(heartRate[index]);
    const sampleVelocity = toStreamNumber(velocity[index]);

    if (elevationDifference > 0) {
      elevationGain += elevationDifference;
    }

    gradeSamples.push(gradePercent);
    effortSamples.push(
      getGradeAdjustedEffort({
        averageHeartRate: HEART_RATE_BASELINE,
        averageVelocity: velocityBaseline,
        distanceDeltaMetres,
        elevationDifference,
        gradePercent,
        heartRate: sampleHeartRate,
        paceDirection: 'faster',
        velocity: sampleVelocity,
      }),
    );
  }

  if (!effortSamples.length) {
    return null;
  }

  const climbingSamples = gradeSamples.filter((value) => value >= 3);
  const averagePace =
    averageVelocity && averageVelocity > 0
      ? 1000 / (averageVelocity * 60)
      : null;

  return {
    effort: Number(getAverage(effortSamples).toFixed(1)),
    climbingShare: Number(
      ((climbingSamples.length / gradeSamples.length) * 100).toFixed(1),
    ),
    averageClimbingGrade: climbingSamples.length
      ? Number(getAverage(climbingSamples).toFixed(1))
      : 0,
    averageHeartRate: averageHeartRate
      ? Number(averageHeartRate.toFixed(1))
      : null,
    averagePace: averagePace ? Number(averagePace.toFixed(2)) : null,
    elevationGain: Number(
      (elevationGain || toStreamNumber(activity.total_elevation_gain, 0)).toFixed(1),
    ),
    sampleCount: effortSamples.length,
  };
};
