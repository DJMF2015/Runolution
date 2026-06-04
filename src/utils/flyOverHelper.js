import * as turf from '@turf/turf';

export const FLYOVER_SPEEDS = [0.5, 1, 1.5, 2, 2.5, 3.0, 3.5, 4.0, 4.5];
export const FLYOVER_INTRO_DURATION_MS = 2500;
export const FLYOVER_OUTRO_DURATION_MS = 3600;
export const FLYOVER_ZOOM = 13.7; //
export const FLYOVER_PITCH = 58;
export const FLYOVER_OUTRO_PITCH = 38;
export const ACTIVITY_ROUTE_SOURCE_ID = 'linepath';
export const DEFAULT_FLYOVER_ROUTE_GRADIENT = '#fb0707';
export const FLYOVER_ROUTE_GRADIENT = '#e1ff00';

// Camera tuning values are deliberately grouped here so the animation hook can
// focus on orchestration while this module owns route geometry and smoothing.
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const METRES_PER_KM = 1000;
const SECONDS_PER_MINUTE = 60;
const SMOOTHING_SAMPLE_COUNT = 9; // Must be an odd number to have a center sample and symmetric smoothing on either side
const CAMERA_TARGET_SMOOTHING_RATIO = 0.018;
const MIN_CAMERA_TARGET_SMOOTHING_KM = 0.08; //
const MAX_CAMERA_TARGET_SMOOTHING_KM = 0.45;
const SAME_DIRECTION_BEARING_THRESHOLD = 15; // increase for less jitter, decrease for more responsiveness
const DRAMATIC_BEARING_CHANGE_THRESHOLD = 45; // increase to dampen more turns, decrease to allow sharper turns
const DRAMATIC_TURN_DAMPING = 0.4; //Softer dramatic turns feel more natural, but increase for sharper turns and decrease for softer turns
const NORMAL_TURN_RATE = 0.015; //Increase for faster turns, decrease for slower turns. This is applied to all turns, but sharper turns are further damped by the DRAMATIC_TURN_DAMPING factor.
const DRAMATIC_TURN_RATE = 0.095;
const CAMERA_CENTER_SMOOTHING = 0.075; //Smoother camera panning: increase for smoother movement, decrease for more responsive movement

const STREAM_KEYS = [
  'distance',
  'altitude',
  'time',
  'velocity_smooth',
  'moving',
  'grade_smooth',
];

const getStreamData = (streams, key) => {
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

const isValidLatLng = (coordinate) => {
  if (!Array.isArray(coordinate) || coordinate.length < 2) {
    return false;
  }

  const [lat, lng] = coordinate;

  return Number.isFinite(lat) && Number.isFinite(lng);
};

const isSameCoordinate = (firstCoordinate, secondCoordinate) => {
  return (
    firstCoordinate?.[0] === secondCoordinate?.[0] &&
    firstCoordinate?.[1] === secondCoordinate?.[1]
  );
};

/**
 * Converts Strava keyed stream data into a flyover LineString.
 * Stream coordinates are denser than summary polylines, and the other stream
 * arrays are preserved as route properties for future camera or telemetry tuning.
 */
export const getFlyoverRouteFeatureFromStreams = (streams) => {
  const latLngStream = getStreamData(streams, 'latlng');

  if (latLngStream.length < 2) {
    return null;
  }

  const streamProperties = STREAM_KEYS.reduce(
    (properties, key) => ({
      ...properties,
      [key]: [],
    }),
    {},
  );
  const coordinates = [];
  let previousCoordinate = null;

  latLngStream.forEach((latLng, streamIndex) => {
    if (!isValidLatLng(latLng)) {
      return;
    }

    const [lat, lng] = latLng;
    const coordinate = [lng, lat];

    if (isSameCoordinate(coordinate, previousCoordinate)) {
      return;
    }

    coordinates.push(coordinate);
    previousCoordinate = coordinate;

    STREAM_KEYS.forEach((key) => {
      streamProperties[key].push(getStreamData(streams, key)?.[streamIndex]);
    });
  });

  if (coordinates.length < 2) {
    return null;
  }

  return turf.lineString(coordinates, {
    source: 'streams',
    streams: streamProperties,
  });
};

export const getFlyoverRouteDistanceKm = (routeLine) => {
  const geometryDistanceKm = routeLine
    ? turf.length(routeLine, { units: 'kilometers' })
    : 0;
  const distanceStream = routeLine?.properties?.streams?.distance;
  const firstDistance = Number(distanceStream?.[0]);
  const lastDistance = Number(distanceStream?.[distanceStream.length - 1]);

  if (Number.isFinite(firstDistance) && Number.isFinite(lastDistance)) {
    const streamDistanceKm = Math.max(lastDistance - firstDistance, 0) / METRES_PER_KM;
    const distanceRatio = geometryDistanceKm ? streamDistanceKm / geometryDistanceKm : 1;

    if (streamDistanceKm > 0 && distanceRatio >= 0.8 && distanceRatio <= 1.2) {
      return streamDistanceKm;
    }
  }

  return geometryDistanceKm;
};

export const getFlyoverRouteCoordinates = (routeLine, fallbackCoordinates = []) => {
  return routeLine?.geometry?.coordinates?.length > 1
    ? routeLine.geometry.coordinates
    : fallbackCoordinates;
};
/**
 * Calculates a bounded flyover duration from route length.
 * Short routes still get enough time to feel intentional, while long routes are
 * capped so the animation does not become tedious.
 *
 * @param {number} routeDistanceKm - Total route length in kilometers.
 * @returns {number} Animation duration in milliseconds.
 */
export const getFlyoverDuration = (routeDistanceKm, streams) => {
  if (!routeDistanceKm) {
    return 22000;
  }

  const distanceDuration = routeDistanceKm * 3200;
  const timeStream = streams?.time;
  const firstTime = Number(timeStream?.[0]);
  const lastTime = Number(timeStream?.[timeStream.length - 1]);

  if (Number.isFinite(firstTime) && Number.isFinite(lastTime) && lastTime > firstTime) {
    const streamDuration = (lastTime - firstTime) * 20;

    return Math.min(Math.max((distanceDuration + streamDuration) / 2, 22000), 32000);
  }

  return Math.min(Math.max(distanceDuration, 22000), 30000);
};

const getPointOnRoute = (routeLine, distanceKm) => {
  return turf.along(routeLine, distanceKm, {
    units: 'kilometers',
  }).geometry.coordinates;
};

const clamp = (value, min, max) => {
  return Math.min(Math.max(value, min), max);
};

const clampRouteDistance = (distanceKm, routeDistanceKm) => {
  return clamp(distanceKm, 0, routeDistanceKm);
};

const getLookaheadDistance = (routeDistanceKm) => {
  return Math.min(Math.max(routeDistanceKm * 0.12, 0.45), 2.4);
};

const getChaseDistance = (routeDistanceKm) => {
  return Math.min(Math.max(routeDistanceKm * 0.035, 0.18), 0.85);
};

const getCameraTargetSmoothingDistance = (routeDistanceKm) => {
  return clamp(
    routeDistanceKm * CAMERA_TARGET_SMOOTHING_RATIO,
    MIN_CAMERA_TARGET_SMOOTHING_KM,
    MAX_CAMERA_TARGET_SMOOTHING_KM,
  );
};

// Uses a cosine window so samples near the current route position influence the
// camera more than samples at the edge of the smoothing window.
const getCosineSampleWeight = (sampleIndex) => {
  const centerIndex = (SMOOTHING_SAMPLE_COUNT - 1) / 2;
  const offsetRatio = (sampleIndex - centerIndex) / centerIndex;

  return 0.5 + 0.5 * Math.cos(offsetRatio * Math.PI);
};

/**
 * Builds weighted route samples around a distance along the line.
 * These samples are reused for both point and bearing smoothing so the camera
 * follows the same averaged shape regardless of whether it is moving or turning.
 */
const getWeightedRouteSamples = (distanceKm, routeDistanceKm, sampleDistanceKm) => {
  const centerIndex = (SMOOTHING_SAMPLE_COUNT - 1) / 2;

  return Array.from({ length: SMOOTHING_SAMPLE_COUNT }, (_, sampleIndex) => {
    const offsetRatio = (sampleIndex - centerIndex) / centerIndex;
    const distance = clampRouteDistance(
      distanceKm + offsetRatio * sampleDistanceKm,
      routeDistanceKm,
    );

    return {
      distance,
      weight: getCosineSampleWeight(sampleIndex),
    };
  }).filter((sample) => sample.weight > 0);
};

const getSmoothedPointOnRoute = (routeLine, distanceKm, routeDistanceKm) => {
  const smoothingDistance = getCameraTargetSmoothingDistance(routeDistanceKm);
  const samples = getWeightedRouteSamples(distanceKm, routeDistanceKm, smoothingDistance);
  let weightedLng = 0;
  let weightedLat = 0;
  let totalWeight = 0;

  samples.forEach(({ distance, weight }) => {
    const [lng, lat] = getPointOnRoute(routeLine, distance);
    weightedLng += lng * weight;
    weightedLat += lat * weight;
    totalWeight += weight;
  });

  if (!totalWeight) {
    return getPointOnRoute(routeLine, distanceKm);
  }

  return [weightedLng / totalWeight, weightedLat / totalWeight];
};

const normalizeBearing = (bearing) => {
  return ((((bearing + 180) % 360) + 360) % 360) - 180;
};

const getWeightedBearingMean = (bearingSamples) => {
  let sumX = 0;
  let sumY = 0;

  bearingSamples.forEach(({ bearing, weight }) => {
    if (!Number.isFinite(bearing)) {
      return;
    }

    const radians = bearing * DEG_TO_RAD;
    sumX += Math.cos(radians) * weight;
    sumY += Math.sin(radians) * weight;
  });

  if (!sumX && !sumY) {
    return 0;
  }

  return normalizeBearing(Math.atan2(sumY, sumX) * RAD_TO_DEG);
};

/**
 * Reads the route direction at a given distance, looking ahead where possible
 * and behind at the route end. This avoids unstable bearings when Turf cannot
 * compare two distinct forward points.
 */
const getRouteBearingAtDistance = (routeLine, distanceKm, routeDistanceKm) => {
  const lookAheadStep = getLookaheadDistance(routeDistanceKm);
  const currentPoint = turf.point(getPointOnRoute(routeLine, distanceKm));
  const lookAheadDistance = Math.min(distanceKm + lookAheadStep, routeDistanceKm);
  const lookAheadPoint = turf.point(getPointOnRoute(routeLine, lookAheadDistance));

  if (lookAheadDistance === distanceKm) {
    const lookBehindDistance = Math.max(distanceKm - lookAheadStep, 0);
    const lookBehindPoint = turf.point(getPointOnRoute(routeLine, lookBehindDistance));

    return turf.bearing(lookBehindPoint, currentPoint);
  }

  const bearing = turf.bearing(currentPoint, lookAheadPoint);

  return Number.isFinite(bearing) ? bearing : 0;
};

/**
 * Returns a smoothed route bearing in degrees for the current flyover position.
 *
 * @param {GeoJSON.Feature<GeoJSON.LineString>} routeLine - Turf line feature.
 * @param {number} distanceKm - Current distance along the route.
 * @param {number} routeDistanceKm - Total route length in kilometers.
 * @returns {number} Normalized bearing between -180 and 180 degrees.
 */
export const getRouteBearing = (routeLine, distanceKm, routeDistanceKm) => {
  const smoothingDistance = getCameraTargetSmoothingDistance(routeDistanceKm);
  const bearingSamples = getWeightedRouteSamples(
    distanceKm,
    routeDistanceKm,
    smoothingDistance,
  ).map(({ distance, weight }) => ({
    bearing: getRouteBearingAtDistance(routeLine, distance, routeDistanceKm),
    weight,
  }));

  return getWeightedBearingMean(bearingSamples);
};

/**
 * Computes the camera center and bearing for a chase-style route flyover.
 * The center trails the current point while the bearing looks ahead, producing
 * forward movement without abrupt camera swings on tight turns.
 */
export const getFlyoverCameraTarget = (routeLine, distanceKm, routeDistanceKm) => {
  const lookAheadDistance = Math.min(
    distanceKm + getLookaheadDistance(routeDistanceKm),
    routeDistanceKm,
  );
  const chaseDistance = Math.max(distanceKm - getChaseDistance(routeDistanceKm), 0);
  const cameraCenter = getSmoothedPointOnRoute(routeLine, chaseDistance, routeDistanceKm);
  const focusPoint = getSmoothedPointOnRoute(
    routeLine,
    lookAheadDistance,
    routeDistanceKm,
  );
  const targetBearing = turf.bearing(turf.point(cameraCenter), turf.point(focusPoint));
  const routeBearing = getRouteBearing(routeLine, distanceKm, routeDistanceKm);
  const bearing = getWeightedBearingMean([
    { bearing: targetBearing, weight: 0.7 },
    { bearing: routeBearing, weight: 0.3 },
  ]);

  return {
    center: cameraCenter,
    bearing: Number.isFinite(bearing) ? bearing : 0,
  };
};

/**
 * Creates a partial route feature from the start to the current flyover point.
 * This lets the route line behave like progress playback while preserving the
 * original route properties for Mapbox styling.
 */
export const getFlyoverRouteProgressFeature = (
  routeLine,
  distanceKm,
  routeDistanceKm,
) => {
  const clampedDistance = clampRouteDistance(distanceKm, routeDistanceKm);

  if (clampedDistance >= routeDistanceKm) {
    return routeLine;
  }

  const startCoordinate = routeLine.geometry.coordinates[0];
  const currentCoordinate = getPointOnRoute(routeLine, clampedDistance);

  if (clampedDistance === 0) {
    return turf.lineString([startCoordinate, currentCoordinate], routeLine.properties);
  }

  const routeProgressFeature = turf.lineSliceAlong(routeLine, 0, clampedDistance, {
    units: 'kilometers',
  });
  const progressCoordinates = routeProgressFeature.geometry.coordinates;
  const lastProgressCoordinate = progressCoordinates[progressCoordinates.length - 1];

  if (
    lastProgressCoordinate?.[0] !== currentCoordinate[0] ||
    lastProgressCoordinate?.[1] !== currentCoordinate[1]
  ) {
    progressCoordinates.push(currentCoordinate);
  }

  if (progressCoordinates.length < 2) {
    progressCoordinates.push(currentCoordinate);
  }

  return turf.lineString(progressCoordinates, routeLine.properties);
};

/**
 * Updates the shared activity route source if the Mapbox source is available.
 * The null checks keep flyover cleanup safe during route changes and unmounts.
 */
export const setActivityRouteData = (map, routeData) => {
  const routeSource = map?.getSource(ACTIVITY_ROUTE_SOURCE_ID);

  if (routeSource && routeData) {
    routeSource.setData(routeData);
  }
};

/**
 * Replaces the displayed route with a progress segment for the current
 * flyover distance.
 */
export const setFlyoverRouteProgress = (map, routeLine, distanceKm, routeDistanceKm) => {
  setActivityRouteData(
    map,
    getFlyoverRouteProgressFeature(routeLine, distanceKm, routeDistanceKm),
  );
};

/**
 * Selects the flyover route color for the active map style.
 */
export const getFlyoverRouteGradient = (mapStyle) => {
  return mapStyle === 'satellite'
    ? FLYOVER_ROUTE_GRADIENT
    : DEFAULT_FLYOVER_ROUTE_GRADIENT;
};

/**
 * Applies the flyover route color to the Mapbox route line layer.
 */
export const setFlyoverRouteGradient = (map, mapStyle) => {
  if (!map?.getLayer('line-dashed')) {
    return;
  }

  map.setPaintProperty('line-dashed', 'line-color', getFlyoverRouteGradient(mapStyle));
};

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

/**
 * Applies an ease-in/ease-out curve to linear flyover progress.
 */
export const smoothFlyoverProgress = (progress) => {
  const clampedProgress = clamp(progress, 0, 1);

  return 0.5 - Math.cos(clampedProgress * Math.PI) / 2;
};

const getBearingDelta = (currentBearing, targetBearing) => {
  return normalizeBearing(targetBearing - currentBearing);
};

/**
 * Smooths camera bearing changes while damping sharp turns.
 * Small direction changes are ignored to prevent visible camera jitter on
 * noisy polyline data.
 */
export const smoothBearing = (currentBearing, targetBearing) => {
  if (currentBearing === null || currentBearing === undefined) {
    return normalizeBearing(targetBearing);
  }

  const delta = getBearingDelta(currentBearing, targetBearing);
  const absoluteDelta = Math.abs(delta);

  if (absoluteDelta < SAME_DIRECTION_BEARING_THRESHOLD) {
    return currentBearing;
  }

  const isDramaticTurn = absoluteDelta >= DRAMATIC_BEARING_CHANGE_THRESHOLD;
  const dampedDelta = isDramaticTurn ? delta * DRAMATIC_TURN_DAMPING : delta;
  const turnRate = isDramaticTurn ? DRAMATIC_TURN_RATE : NORMAL_TURN_RATE;

  return normalizeBearing(currentBearing + dampedDelta * turnRate);
};

/**
 * Smooths camera center movement between two longitude/latitude pairs.
 */
export const smoothLngLat = (currentLngLat, targetLngLat) => {
  if (!currentLngLat) {
    return targetLngLat;
  }

  return [
    currentLngLat[0] + (targetLngLat[0] - currentLngLat[0]) * CAMERA_CENTER_SMOOTHING,
    currentLngLat[1] + (targetLngLat[1] - currentLngLat[1]) * CAMERA_CENTER_SMOOTHING,
  ];
};

/**
 * Creates the DOM element used by the Mapbox marker during route flyover.
 */
export const createFlyoverMarkerElement = () => {
  const marker = document.createElement('div');
  marker.style.width = '12.5px';
  marker.style.height = '12.5px';
  marker.style.border = '2px solid #020617';
  marker.style.borderRadius = '50%';
  marker.style.background = '#fc002e';
  marker.style.boxShadow = '0 0 0 2px rgb(248, 134, 20), 0 10px 22px rgba(0, 0, 0, 0.42)';
  marker.style.transform = 'rotate(45deg)';
  return marker;
};
