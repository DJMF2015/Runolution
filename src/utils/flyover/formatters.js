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

const getStreamArray = (streams, key) => {
  if (Array.isArray(streams?.[key])) {
    return streams[key];
  }

  return streams?.[key]?.data || [];
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

/**
 * Formats elevation gain for the post-flyover summary.
 */
export const formatFlyoverElevation = (elevationMetres) => {
  return `${Math.round(Number(elevationMetres || 0)).toLocaleString('en-GB')} m`;
};
