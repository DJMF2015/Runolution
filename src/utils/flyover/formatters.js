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

/**
 * Formats elevation gain for the post-flyover summary.
 */
export const formatFlyoverElevation = (elevationMetres) => {
  return `${Math.round(Number(elevationMetres || 0)).toLocaleString('en-GB')} m`;
};
