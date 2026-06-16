import * as turf from '@turf/turf';
import {
  ACTIVITY_ROUTE_LAYER_ID,
  ACTIVITY_ROUTE_SOURCE_ID,
  CAMERA_CENTER_SMOOTHING,
  CAMERA_DRAMATIC_TURN_LEAD_RATIO,
  CAMERA_HIGH_SPEED_LEAD_RATIO,
  CAMERA_MARKER_LEAD_RATIO,
  CAMERA_MAX_TURN_LEAD_DEGREES,
  CAMERA_TARGET_SMOOTHING_RATIO,
  COMPACT_CORNER_MAX_DIAMETER_KM,
  COMPACT_CORNER_MIN_TOTAL_TURN_DEGREES,
  COMPACT_CORNER_MIN_TURN_COUNT,
  COMPACT_CORNER_MIN_TURN_DEGREES,
  DEFAULT_FLYOVER_ROUTE_GRADIENT,
  DEG_TO_RAD,
  DRAMATIC_BEARING_CHANGE_THRESHOLD,
  DRAMATIC_TURN_DAMPING,
  ELEVATION_CAMERA_ADJUSTMENTS,
  FLYOVER_ALTITUDE_LIMITS,
  FLYOVER_HIGH_ROUTE_ALTITUDE_METRES,
  FLYOVER_HIGH_ROUTE_ALTITUDE_RAMP_METRES,
  FLYOVER_HIGH_ROUTE_CLEARANCE_METRES,
  FLYOVER_HIGH_ROUTE_MAX_CAMERA_ALTITUDE,
  FLYOVER_HIGH_ROUTE_MAX_ZOOM_OUT,
  FLYOVER_HIGH_SPEED_THRESHOLD,
  FLYOVER_ROUTE_GRADIENT,
  FLYOVER_ZOOM,
  FLYOVER_ZOOM_LIMITS,
  LOOPING_ROUTE_BEARING_THRESHOLD,
  LOOPING_ROUTE_MACRO_BEARING_WEIGHT,
  LOOPING_ROUTE_MACRO_LOOKAHEAD_RATIO,
  MAX_CAMERA_TARGET_SMOOTHING_KM,
  MAX_LOOPING_ROUTE_MACRO_LOOKAHEAD_KM,
  MIN_CAMERA_TARGET_SMOOTHING_KM,
  MIN_LOOPING_ROUTE_MACRO_LOOKAHEAD_KM,
  NORMAL_TURN_RATE,
  RAD_TO_DEG,
  RESPONSIVE_CAMERA_ADJUSTMENTS,
  ROUTE_DISTANCE_ALTITUDE_STOPS,
  ROUTE_DISTANCE_ZOOM_STOPS,
  SAME_DIRECTION_BEARING_THRESHOLD,
  SMALL_LOOP_DETECTION_DISTANCE_KM,
  SMALL_LOOP_MAX_DIAMETER_KM,
  SMALL_LOOP_MIN_BEARING_SPREAD_DEGREES,
  SMALL_LOOP_MIN_PATH_TO_DIAMETER_RATIO,
  SMOOTHING_SAMPLE_COUNT,
  DRAMATIC_TURN_RATE,
} from './config';

export {
  formatFlyoverDistance,
  formatFlyoverElevation,
  formatFlyoverPace,
  formatFlyoverStreamAveragePace,
  formatFlyoverTotalDistance,
} from './formatters';
export { createFlyoverMarkerElement } from './marker';
export {
  getFlyoverRouteCoordinates,
  getFlyoverRouteDistanceKm,
  getFlyoverRouteFeatureFromStreams,
} from './routeData';

export {
  ACTIVITY_ROUTE_LAYER_ID,
  ACTIVITY_ROUTE_SOURCE_ID,
  DEFAULT_FLYOVER_ROUTE_GRADIENT,
  FLYOVER_HIGH_SPEED_CAMERA_CENTER_SMOOTHING,
  FLYOVER_HIGH_SPEED_THRESHOLD,
  FLYOVER_INTRO_DURATION_MS,
  FLYOVER_INTRO_START_ALTITUDE,
  FLYOVER_OUTRO_DURATION_MS,
  FLYOVER_OUTRO_PITCH,
  FLYOVER_PITCH,
  FLYOVER_ROUTE_GRADIENT,
  FLYOVER_SPEEDS,
  FLYOVER_TILE_WAIT_MS,
  FLYOVER_ZOOM,
} from './config';

// simple linear interpolation between two values
export const lerp = (start, end, ratio) => {
  return start + (end - start) * ratio;
};

/**
 * Equivalent to d3.easeCubicOut. Keeping the small function local avoids
 * shipping d3-ease for one easing curve.
 */
export const easeCubicOut = (progress) => {
  const clampedProgress = clamp(progress, 0, 1);

  return 1 - Math.pow(1 - clampedProgress, 3);
};

const clamp = (value, min, max) => {
  return Math.min(Math.max(value, min), max);
};

const interpolateLngLat = (fromLngLat, toLngLat, ratio) => {
  return [
    lerp(fromLngLat[0], toLngLat[0], ratio),
    lerp(fromLngLat[1], toLngLat[1], ratio),
  ];
};

/**
 * Computes the camera position based on pitch, bearing, target position, and altitude.
 * @param {*} pitch
 * @param {*} bearing
 * @param {*} targetPosition
 * @param {*} altitude
 * @returns
 */
export const computeCameraPosition = (pitch, bearing, targetPosition, altitude) => {
  const bearingInRadian = bearing / 57.29;
  const pitchInRadian = (90 - pitch) / 57.29;
  const lngDiff =
    ((altitude / Math.tan(pitchInRadian)) * Math.sin(-bearingInRadian)) / 70000;
  const latDiff =
    ((altitude / Math.tan(pitchInRadian)) * Math.cos(-bearingInRadian)) / 110000;

  return {
    lng: targetPosition.lng + lngDiff,
    lat: targetPosition.lat - latDiff,
  };
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

const getZoomForRouteDistance = (distanceKm) => {
  return getRouteDistanceStopValue(ROUTE_DISTANCE_ZOOM_STOPS, distanceKm, FLYOVER_ZOOM);
};

const getRouteDistanceStopValue = (stops, distanceKm, fallbackValue) => {
  return stops.find((stop) => distanceKm < stop.thresholdKm)?.value || fallbackValue;
};

const getResponsiveCameraAdjustment = (property) => {
  if (typeof window === 'undefined') {
    return 0;
  }

  return (
    RESPONSIVE_CAMERA_ADJUSTMENTS.find(
      (adjustment) => window.innerWidth < adjustment.maxWidth,
    )?.[property] || 0
  );
};

const getRouteDistanceAltitude = (distanceKm) => {
  return getRouteDistanceStopValue(
    ROUTE_DISTANCE_ALTITUDE_STOPS,
    distanceKm,
    FLYOVER_ALTITUDE_LIMITS.max,
  );
};

const getElevationGainFromAltitudeStream = (altitudeStream = []) => {
  return altitudeStream.reduce((totalGain, altitude, index) => {
    const currentAltitude = Number(altitude);
    const previousAltitude = Number(altitudeStream[index - 1]);

    if (
      !index ||
      !Number.isFinite(currentAltitude) ||
      !Number.isFinite(previousAltitude)
    ) {
      return totalGain;
    }

    return totalGain + Math.max(currentAltitude - previousAltitude, 0);
  }, 0);
};

const getElevationGainPerKm = (routeDistanceKm, totalElevationGain, streams) => {
  if (!routeDistanceKm) {
    return 0;
  }

  const streamElevationGain = getElevationGainFromAltitudeStream(streams?.altitude);
  const elevationGain = Math.max(Number(totalElevationGain || 0), streamElevationGain);

  return elevationGain / routeDistanceKm;
};

const getElevationCameraAdjustment = (routeDistanceKm, totalElevationGain, streams) => {
  const elevationGainPerKm = getElevationGainPerKm(
    routeDistanceKm,
    totalElevationGain,
    streams,
  );

  return (
    ELEVATION_CAMERA_ADJUSTMENTS.find(
      (adjustment) => elevationGainPerKm >= adjustment.minGainPerKm,
    ) || { zoom: 0, altitude: 0 }
  );
};

const getMaxRouteAltitudeMetres = (streams) => {
  const altitudeStream = streams?.altitude;

  if (!Array.isArray(altitudeStream) || altitudeStream.length < 2) {
    return 0;
  }

  return altitudeStream.reduce((maxAltitude, altitude) => {
    const altitudeMetres = Number(altitude);

    return Number.isFinite(altitudeMetres)
      ? Math.max(maxAltitude, altitudeMetres)
      : maxAltitude;
  }, 0);
};

const getHighRouteAltitudeRisk = (streams) => {
  const altitudeAboveThreshold =
    getMaxRouteAltitudeMetres(streams) - FLYOVER_HIGH_ROUTE_ALTITUDE_METRES;

  return clamp(altitudeAboveThreshold / FLYOVER_HIGH_ROUTE_ALTITUDE_RAMP_METRES, 0, 1);
};

/**
 * Applies the same camera adjustment pipeline to zoom and altitude: route
 * distance gives the base value, viewport size opens the framing on smaller
 * screens, and elevation gain opens the framing on hillier routes.
 */
const getAdjustedCameraValue = ({
  baseValue,
  limits,
  property,
  routeDistanceKm,
  streams,
  totalElevationGain,
}) => {
  const responsiveAdjustment = getResponsiveCameraAdjustment(property);
  const elevationAdjustment = getElevationCameraAdjustment(
    routeDistanceKm,
    totalElevationGain,
    streams,
  )[property];
  const highRouteAltitudeRisk = getHighRouteAltitudeRisk(streams);
  const adjustedValue = baseValue + responsiveAdjustment + elevationAdjustment;

  if (property === 'altitude' && highRouteAltitudeRisk > 0) {
    const safeAltitude =
      getMaxRouteAltitudeMetres(streams) + FLYOVER_HIGH_ROUTE_CLEARANCE_METRES;

    return clamp(
      Math.max(adjustedValue, safeAltitude),
      limits.min,
      FLYOVER_HIGH_ROUTE_MAX_CAMERA_ALTITUDE,
    );
  }

  return clamp(
    adjustedValue - highRouteAltitudeRisk * FLYOVER_HIGH_ROUTE_MAX_ZOOM_OUT,
    limits.min,
    limits.max,
  );
};

export const getFlyoverZoom = ({ routeDistanceKm, streams, totalElevationGain }) => {
  return getAdjustedCameraValue({
    baseValue: getZoomForRouteDistance(routeDistanceKm),
    limits: FLYOVER_ZOOM_LIMITS,
    property: 'zoom',
    routeDistanceKm,
    streams,
    totalElevationGain,
  });
};

export const getFlyoverAltitude = ({ routeDistanceKm, streams, totalElevationGain }) => {
  return getAdjustedCameraValue({
    baseValue: getRouteDistanceAltitude(routeDistanceKm),
    limits: FLYOVER_ALTITUDE_LIMITS,
    property: 'altitude',
    routeDistanceKm,
    streams,
    totalElevationGain,
  });
};

const getPointOnRoute = (routeLine, distanceKm) => {
  return turf.along(routeLine, distanceKm, {
    units: 'kilometers',
  }).geometry.coordinates;
};

const clampRouteDistance = (distanceKm, routeDistanceKm) => {
  return clamp(distanceKm, 0, routeDistanceKm);
};

const getLookaheadDistance = (routeDistanceKm) => {
  return Math.min(Math.max(routeDistanceKm * 0.12, 0.45), 2.4);
};

const getLoopingRouteLookaheadDistance = (routeDistanceKm) => {
  return clamp(
    routeDistanceKm * LOOPING_ROUTE_MACRO_LOOKAHEAD_RATIO,
    MIN_LOOPING_ROUTE_MACRO_LOOKAHEAD_KM,
    Math.min(MAX_LOOPING_ROUTE_MACRO_LOOKAHEAD_KM, routeDistanceKm),
  );
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

// returns the smallest difference between two bearings, normalized to a value between -180 and 180 degrees.
// This is used to determine how much the camera should lead the marker during turnns.
const normalizeBearing = (bearing) => {
  return ((((bearing + 180) % 360) + 360) % 360) - 180;
};

export const normalizeBearingDifference = (fromBearing, toBearing) => {
  return normalizeBearing(toBearing - fromBearing);
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
 * getMacroRoutebearing looks at a longer route segment to determine the broader route direction.
 * This helps stabilize the camera bearing on looping routes where the local direction can spin wildly.
 * When the local and macro bearings diverge sharply, getLoopStableBearing blends them to keep the camera steady.
 * @param {*} routeLine
 * @param {*} distanceKm
 * @param {*} routeDistanceKm
 * @returns
 */
const getMacroRouteBearing = (routeLine, distanceKm, routeDistanceKm) => {
  const lookaheadDistance = getLoopingRouteLookaheadDistance(routeDistanceKm);
  const fromDistance = clampRouteDistance(
    distanceKm - lookaheadDistance * 0.35,
    routeDistanceKm,
  );
  const toDistance = clampRouteDistance(distanceKm + lookaheadDistance, routeDistanceKm);

  if (fromDistance === toDistance) {
    return getRouteBearing(routeLine, distanceKm, routeDistanceKm);
  }

  const fromPoint = turf.point(getPointOnRoute(routeLine, fromDistance));
  const toPoint = turf.point(getPointOnRoute(routeLine, toDistance));
  const bearing = turf.bearing(fromPoint, toPoint);

  return Number.isFinite(bearing)
    ? bearing
    : getRouteBearing(routeLine, distanceKm, routeDistanceKm);
};

/**
 * Repeated laps can make the local route bearing spin continuously. When the
 * local bearing diverges sharply from the broader route direction, bias the
 * camera toward the macro bearing while still preserving some local movement.
 */
const getLoopStableBearing = (localBearing, macroBearing) => {
  const bearingDelta = Math.abs(normalizeBearing(localBearing - macroBearing));

  if (bearingDelta < LOOPING_ROUTE_BEARING_THRESHOLD) {
    return localBearing;
  }

  return getWeightedBearingMean([
    { bearing: localBearing, weight: 1 - LOOPING_ROUTE_MACRO_BEARING_WEIGHT },
    { bearing: macroBearing, weight: LOOPING_ROUTE_MACRO_BEARING_WEIGHT },
  ]);
};

const getRouteSectionCoordinates = (routeLine, startDistanceKm, endDistanceKm) => {
  const startDistance = clamp(startDistanceKm, 0, endDistanceKm);
  const endDistance = Math.max(endDistanceKm, 0);
  const startCoordinate = getPointOnRoute(routeLine, startDistance);
  const endCoordinate = getPointOnRoute(routeLine, endDistance);

  if (startDistance === endDistance) {
    return [startCoordinate];
  }

  const section = turf.lineSliceAlong(routeLine, startDistance, endDistance, {
    units: 'kilometers',
  });
  const coordinates = section.geometry.coordinates.filter(Boolean);
  const firstCoordinate = coordinates[0];
  const lastCoordinate = coordinates[coordinates.length - 1];

  if (
    firstCoordinate?.[0] !== startCoordinate[0] ||
    firstCoordinate?.[1] !== startCoordinate[1]
  ) {
    coordinates.unshift(startCoordinate);
  }

  if (
    lastCoordinate?.[0] !== endCoordinate[0] ||
    lastCoordinate?.[1] !== endCoordinate[1]
  ) {
    coordinates.push(endCoordinate);
  }

  return coordinates;
};

const getSectionBearings = (coordinates) => {
  if (coordinates.length < 3) {
    return [];
  }

  return coordinates.slice(1).reduce((sectionBearings, coordinate, index) => {
    const previousCoordinate = coordinates[index];

    if (
      previousCoordinate?.[0] === coordinate?.[0] &&
      previousCoordinate?.[1] === coordinate?.[1]
    ) {
      return sectionBearings;
    }

    const bearing = turf.bearing(turf.point(previousCoordinate), turf.point(coordinate));

    return Number.isFinite(bearing) ? [...sectionBearings, bearing] : sectionBearings;
  }, []);
};

const getSectionBearingSpread = (coordinates) => {
  const bearings = getSectionBearings(coordinates);

  if (bearings.length < 2) {
    return 0;
  }

  const sortedBearings = bearings
    .map((bearing) => (normalizeBearing(bearing) + 360) % 360)
    .sort((a, b) => a - b);
  const largestGap = sortedBearings.reduce((gap, bearing, index) => {
    const nextBearing = sortedBearings[(index + 1) % sortedBearings.length];
    const bearingGap =
      index === sortedBearings.length - 1
        ? nextBearing + 360 - bearing
        : nextBearing - bearing;

    return Math.max(gap, bearingGap);
  }, 0);

  return 360 - largestGap;
};

const getSectionTurnMetrics = (coordinates) => {
  const bearings = getSectionBearings(coordinates);

  return bearings.slice(1).reduce(
    (metrics, bearing, index) => {
      const turnDegrees = Math.abs(
        normalizeBearingDifference(bearings[index], bearing),
      );

      return {
        sharpTurnCount:
          metrics.sharpTurnCount +
          (turnDegrees >= COMPACT_CORNER_MIN_TURN_DEGREES ? 1 : 0),
        totalTurnDegrees: metrics.totalTurnDegrees + turnDegrees,
      };
    },
    { sharpTurnCount: 0, totalTurnDegrees: 0 },
  );
};

const getLoopDetectionWindow = (distanceKm, routeDistanceKm, sectionDistanceKm) => {
  const currentDistance = clampRouteDistance(distanceKm, routeDistanceKm);
  let startDistance = clampRouteDistance(
    currentDistance - sectionDistanceKm * 0.35,
    routeDistanceKm,
  );
  let endDistance = clampRouteDistance(
    currentDistance + sectionDistanceKm * 0.65,
    routeDistanceKm,
  );
  const missingDistance = sectionDistanceKm - (endDistance - startDistance);

  if (missingDistance > 0) {
    startDistance = clampRouteDistance(startDistance - missingDistance, routeDistanceKm);
    endDistance = clampRouteDistance(endDistance + missingDistance, routeDistanceKm);
  }

  return {
    startDistance,
    endDistance,
    sectionLength: endDistance - startDistance,
  };
};

/**
 * Detects compact loop sections where the route keeps turning inside a small
 * area. During these sections the camera bearing can spin faster than the
 * marker movement feels, so the animation temporarily locks rotation.
 */
export const detectSmallLoopSection = ({
  routeLine,
  distanceKm,
  routeDistanceKm,
  sectionDistanceKm = SMALL_LOOP_DETECTION_DISTANCE_KM,
  maxDiameterKm = SMALL_LOOP_MAX_DIAMETER_KM,
  minPathToDiameterRatio = SMALL_LOOP_MIN_PATH_TO_DIAMETER_RATIO,
  minBearingSpread = SMALL_LOOP_MIN_BEARING_SPREAD_DEGREES,
  compactCornerMaxDiameterKm = COMPACT_CORNER_MAX_DIAMETER_KM,
  minSharpTurnCount = COMPACT_CORNER_MIN_TURN_COUNT,
  minTotalTurnDegrees = COMPACT_CORNER_MIN_TOTAL_TURN_DEGREES,
}) => {
  if (!routeLine || !routeDistanceKm || routeDistanceKm < sectionDistanceKm * 0.55) {
    return false;
  }

  const detectionDistanceKm = Math.min(sectionDistanceKm, routeDistanceKm);
  const { startDistance, endDistance, sectionLength } = getLoopDetectionWindow(
    distanceKm,
    routeDistanceKm,
    detectionDistanceKm,
  );

  if (sectionLength < detectionDistanceKm * 0.65) {
    return false;
  }

  const coordinates = getRouteSectionCoordinates(routeLine, startDistance, endDistance);

  if (coordinates.length < 4) {
    return false;
  }

  const bbox = turf.bbox(turf.lineString(coordinates));
  const diagonalKm = turf.distance([bbox[0], bbox[1]], [bbox[2], bbox[3]], {
    units: 'kilometers',
  });
  const pathToDiameterRatio = sectionLength / Math.max(diagonalKm, Number.EPSILON);
  const bearingSpread = getSectionBearingSpread(coordinates);
  const { sharpTurnCount, totalTurnDegrees } = getSectionTurnMetrics(coordinates);
  const isCompactLoop =
    diagonalKm <= maxDiameterKm &&
    pathToDiameterRatio >= minPathToDiameterRatio &&
    bearingSpread >= minBearingSpread;
  const hasRepeatedSharpTurns =
    diagonalKm <= compactCornerMaxDiameterKm &&
    sharpTurnCount >= minSharpTurnCount &&
    totalTurnDegrees >= minTotalTurnDegrees &&
    bearingSpread >= minBearingSpread;

  return isCompactLoop || hasRepeatedSharpTurns;
};

const getCameraLeadRatio = (turnDelta, flyoverSpeed = 1) => {
  const turnRatio = clamp(Math.abs(turnDelta) / CAMERA_MAX_TURN_LEAD_DEGREES, 0, 1);
  const normalLeadRatio =
    flyoverSpeed >= FLYOVER_HIGH_SPEED_THRESHOLD
      ? CAMERA_HIGH_SPEED_LEAD_RATIO
      : CAMERA_MARKER_LEAD_RATIO;

  return (
    normalLeadRatio - (normalLeadRatio - CAMERA_DRAMATIC_TURN_LEAD_RATIO) * turnRatio
  );
};

/**
 * Computes a marker-safe camera center and bearing for the route flyover.
 * The center stays near the marker with a small forward lead, then reduces that
 * lead during sharp turns or fast playback so the marker remains in view.
 */
export const getFlyoverCameraTarget = (
  routeLine,
  distanceKm,
  routeDistanceKm,
  flyoverSpeed,
) => {
  const lookAheadDistance = Math.min(
    distanceKm + getLookaheadDistance(routeDistanceKm),
    routeDistanceKm,
  );
  const currentPoint = getSmoothedPointOnRoute(routeLine, distanceKm, routeDistanceKm);
  const focusPoint = getSmoothedPointOnRoute(
    routeLine,
    lookAheadDistance,
    routeDistanceKm,
  );
  const targetBearing = turf.bearing(turf.point(currentPoint), turf.point(focusPoint));
  const routeBearing = getRouteBearing(routeLine, distanceKm, routeDistanceKm);
  const turnDelta = normalizeBearing(targetBearing - routeBearing);
  const cameraCenter = interpolateLngLat(
    currentPoint,
    focusPoint,
    getCameraLeadRatio(turnDelta, flyoverSpeed),
  );
  const localBearing = getWeightedBearingMean([
    { bearing: targetBearing, weight: 0.7 },
    { bearing: routeBearing, weight: 0.3 },
  ]);
  const macroBearing = getMacroRouteBearing(routeLine, distanceKm, routeDistanceKm);
  const bearing = getLoopStableBearing(localBearing, macroBearing);

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
  if (!map?.getLayer(ACTIVITY_ROUTE_LAYER_ID)) {
    return;
  }

  map.setPaintProperty(
    ACTIVITY_ROUTE_LAYER_ID,
    'line-color',
    getFlyoverRouteGradient(mapStyle),
  );
};

/**
 * Applies an ease-in/ease-out curve to linear flyover progress.
 */
export const smoothFlyoverProgress = (progress) => {
  const clampedProgress = clamp(progress, 0, 1);

  return 0.5 - Math.cos(clampedProgress * Math.PI) / 2;
};

const getBearingDelta = (currentBearing, targetBearing) => {
  return normalizeBearingDifference(currentBearing, targetBearing);
};

/**
 * Adds route-context bearing control on top of ordinary smoothing. Small loops
 * lock the current bearing, minor changes are ignored, and open route sections
 * keep the existing gradual camera rotation.
 */
export const getStableBearing = ({
  previousBearing,
  targetBearing,
  isLooping,
  minChange = SAME_DIRECTION_BEARING_THRESHOLD,
}) => {
  if (previousBearing === null || previousBearing === undefined) {
    return normalizeBearing(targetBearing);
  }

  if (isLooping) {
    return previousBearing;
  }

  const delta = Math.abs(normalizeBearingDifference(previousBearing, targetBearing));

  if (delta < minChange) {
    return previousBearing;
  }

  return smoothBearing(previousBearing, targetBearing);
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

  return normalizeBearing(lerp(currentBearing, currentBearing + dampedDelta, turnRate));
};

/**
 * Smooths camera center movement between two longitude/latitude pairs.
 */
export const smoothLngLat = (
  currentLngLat,
  targetLngLat,
  smoothingRatio = CAMERA_CENTER_SMOOTHING,
) => {
  if (!currentLngLat) {
    return targetLngLat;
  }

  return [
    lerp(currentLngLat[0], targetLngLat[0], smoothingRatio),
    lerp(currentLngLat[1], targetLngLat[1], smoothingRatio),
  ];
};
