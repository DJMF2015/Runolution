import { METRES_PER_KM, SECONDS_PER_MINUTE } from './config';

/**
 * Formats a flyover distance value for compact on-map display.
 */
export const formatFlyoverDistance = (distanceKm) => {
  return `${Number(distanceKm || 0).toFixed(2)} km`;
};

/**
 * Converts Strava's metre distance into the flyover distance label.
 */
export const formatFlyoverTotalDistance = (distanceMetres) => {
  return formatFlyoverDistance(Number(distanceMetres || 0) / METRES_PER_KM);
};

/**
 * Formats average pace using Strava activity distance and moving time.
 */
export const formatFlyoverPace = (distanceMetres, movingTimeSeconds) => {
  const distanceKm = Number(distanceMetres || 0) / METRES_PER_KM;
  const movingSeconds = Number(movingTimeSeconds || 0);

  if (!distanceKm || !movingSeconds) {
    return '-- /km';
  }

  const paceSeconds = Math.round(movingSeconds / distanceKm);
  const minutes = Math.floor(paceSeconds / SECONDS_PER_MINUTE);
  const seconds = paceSeconds % SECONDS_PER_MINUTE;

  return `${minutes}:${String(seconds).padStart(2, '0')} /km`;
};

const formatFlyoverPaceFromVelocity = (metresPerSecond) => {
  const speed = Number(metresPerSecond || 0);

  if (!Number.isFinite(speed) || speed <= 0) {
    return '-- /km';
  }

  const paceSeconds = Math.round(METRES_PER_KM / speed);
  const minutes = Math.floor(paceSeconds / SECONDS_PER_MINUTE);
  const seconds = paceSeconds % SECONDS_PER_MINUTE;

  return `${minutes}:${String(seconds).padStart(2, '0')} /km`;
};

const formatFlyoverSpeedFromVelocity = (metresPerSecond) => {
  const speed = Number(metresPerSecond || 0);

  if (!Number.isFinite(speed) || speed <= 0) {
    return '-- km/h';
  }

  return `${(speed * 3.6).toFixed(1)} km/h`;
};

const getStreamArray = (streams, key) => {
  if (Array.isArray(streams?.[key])) {
    return streams[key];
  }

  return streams?.[key]?.data || [];
};

const getFiniteNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number) ? number : null;
};

const interpolateValues = (startValue, endValue, ratio) => {
  const start = getFiniteNumber(startValue);
  const end = getFiniteNumber(endValue);

  if (start === null && end === null) {
    return null;
  }

  if (start === null) {
    return end;
  }

  if (end === null) {
    return start;
  }

  return start + (end - start) * ratio;
};

const getInterpolatedStreamVelocity = ({
  distanceKm,
  fallbackDistanceMetres,
  streams,
}) => {
  const distanceStream = getStreamArray(streams, 'distance');
  const velocityStream = getStreamArray(streams, 'velocity_smooth');

  if (!velocityStream.length) {
    return null;
  }

  const distanceMetres = Number(distanceKm || 0) * METRES_PER_KM;

  if (distanceStream.length > 1) {
    const firstDistance = getFiniteNumber(distanceStream[0]);
    const targetDistance =
      firstDistance === null ? null : firstDistance + distanceMetres;

    if (targetDistance === null) {
      return null;
    }

    if (targetDistance <= firstDistance) {
      return getFiniteNumber(velocityStream[0]);
    }

    for (let index = 1; index < distanceStream.length; index += 1) {
      const previousDistance = getFiniteNumber(distanceStream[index - 1]);
      const currentDistance = getFiniteNumber(distanceStream[index]);

      if (
        previousDistance === null ||
        currentDistance === null ||
        currentDistance <= previousDistance
      ) {
        continue;
      }

      if (targetDistance <= currentDistance) {
        const segmentRatio = Math.min(
          Math.max((targetDistance - previousDistance) / (currentDistance - previousDistance), 0),
          1,
        );

        return interpolateValues(
          velocityStream[index - 1],
          velocityStream[index],
          segmentRatio,
        );
      }
    }
  }

  const totalDistanceMetres = Number(fallbackDistanceMetres || 0);

  if (!Number.isFinite(totalDistanceMetres) || totalDistanceMetres <= 0) {
    return getFiniteNumber(velocityStream[velocityStream.length - 1]);
  }

  const progressRatio = Math.min(Math.max(distanceMetres / totalDistanceMetres, 0), 1);
  const streamIndex = progressRatio * (velocityStream.length - 1);
  const previousIndex = Math.floor(streamIndex);
  const nextIndex = Math.min(previousIndex + 1, velocityStream.length - 1);

  return interpolateValues(
    velocityStream[previousIndex],
    velocityStream[nextIndex],
    streamIndex - previousIndex,
  );
};

const getInterpolatedStreamTime = (streams, distanceKm) => {
  const distanceStream = getStreamArray(streams, 'distance');
  const timeStream = getStreamArray(streams, 'time');
  const movingStream = getStreamArray(streams, 'moving');

  if (distanceStream.length < 2 || timeStream.length < 2) {
    return null;
  }

  const firstDistance = Number(distanceStream[0]);
  const targetDistance = firstDistance + Number(distanceKm || 0) * METRES_PER_KM;

  if (!Number.isFinite(firstDistance) || !Number.isFinite(targetDistance)) {
    return null;
  }

  let movingSeconds = 0;

  for (let index = 1; index < distanceStream.length; index += 1) {
    const previousDistance = Number(distanceStream[index - 1]);
    const currentDistance = Number(distanceStream[index]);
    const previousTime = Number(timeStream[index - 1]);
    const currentTime = Number(timeStream[index]);

    if (
      !Number.isFinite(previousDistance) ||
      !Number.isFinite(currentDistance) ||
      !Number.isFinite(previousTime) ||
      !Number.isFinite(currentTime) ||
      currentDistance <= previousDistance
    ) {
      continue;
    }

    const segmentSeconds = Math.max(currentTime - previousTime, 0);
    const isMoving =
      !movingStream.length ||
      movingStream[index] !== false ||
      movingStream[index - 1] !== false;

    if (targetDistance <= currentDistance) {
      const segmentRatio = Math.min(
        Math.max((targetDistance - previousDistance) / (currentDistance - previousDistance), 0),
        1,
      );

      return movingSeconds + (isMoving ? segmentSeconds * segmentRatio : 0);
    }

    if (isMoving) {
      movingSeconds += segmentSeconds;
    }
  }

  return movingSeconds || null;
};

export const formatFlyoverStreamAveragePace = ({
  distanceKm,
  fallbackDistanceMetres,
  fallbackMovingTimeSeconds,
  streams,
}) => {
  const movingSeconds = getInterpolatedStreamTime(streams, distanceKm);
  const distanceMetres = Number(distanceKm || 0) * METRES_PER_KM;

  if (!movingSeconds || distanceMetres < 1) {
    return formatFlyoverPace(fallbackDistanceMetres, fallbackMovingTimeSeconds);
  }

  return formatFlyoverPace(distanceMetres, movingSeconds);
};

export const formatFlyoverLiveStreamMetric = ({
  distanceKm,
  fallbackDistanceMetres,
  fallbackMovingTimeSeconds,
  showSpeed = false,
  streams,
}) => {
  const liveVelocity = getInterpolatedStreamVelocity({
    distanceKm,
    fallbackDistanceMetres,
    streams,
  });

  if (liveVelocity) {
    return {
      label: showSpeed ? 'Speed' : 'Pace',
      value: showSpeed
        ? formatFlyoverSpeedFromVelocity(liveVelocity)
        : formatFlyoverPaceFromVelocity(liveVelocity),
    };
  }

  return {
    label: showSpeed ? 'Avg speed' : 'Avg pace',
    value: showSpeed
      ? formatFlyoverSpeedFromVelocity(
          Number(fallbackDistanceMetres || 0) / Number(fallbackMovingTimeSeconds || 0),
        )
      : formatFlyoverStreamAveragePace({
          distanceKm,
          fallbackDistanceMetres,
          fallbackMovingTimeSeconds,
          streams,
        }),
  };
};

/**
 * Formats elevation gain for the post-flyover summary.
 */
export const formatFlyoverElevation = (elevationMetres) => {
  return `${Math.round(Number(elevationMetres || 0)).toLocaleString('en-GB')} m`;
};
