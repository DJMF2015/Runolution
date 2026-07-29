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
  FLYOVER_HIGH_SPEED_CAMERA_CENTER_SMOOTHING,
  FLYOVER_HIGH_ROUTE_ALTITUDE_METRES,
  FLYOVER_HIGH_ROUTE_ALTITUDE_RAMP_METRES,
  FLYOVER_HIGH_ROUTE_CLEARANCE_METRES,
  FLYOVER_HIGH_ROUTE_MAX_CAMERA_ALTITUDE,
  FLYOVER_HIGH_ROUTE_MAX_ZOOM_OUT,
  FLYOVER_PREP_CHAIKIN_PASSES,
  FLYOVER_PREP_MAX_COORDINATES,
  FLYOVER_PREP_MIN_COORDINATES,
  FLYOVER_PREP_SIMPLIFY_TOLERANCE,
  FLYOVER_HIGH_SPEED_THRESHOLD,
  FLYOVER_ROUTE_GRADIENT,
  FLYOVER_ZOOM,
  FLYOVER_ZOOM_LIMITS,
  MAX_CAMERA_TARGET_SMOOTHING_KM,
  MIN_CAMERA_TARGET_SMOOTHING_KM,
  NORMAL_TURN_RATE,
  RAD_TO_DEG,
  RESPONSIVE_CAMERA_ADJUSTMENTS,
  ROUTE_DISTANCE_ALTITUDE_STOPS,
  ROUTE_DISTANCE_ZOOM_STOPS,
  SAME_DIRECTION_BEARING_THRESHOLD,
  SATELLITE_FLYOVER_ROUTE_GRADIENT,
  SMALL_LOOP_DETECTION_DISTANCE_KM,
  SMALL_LOOP_MAX_DIAMETER_KM,
  SMALL_LOOP_MIN_BEARING_SPREAD_DEGREES,
  SMALL_LOOP_MIN_PATH_TO_DIAMETER_RATIO,
  SMOOTHING_SAMPLE_COUNT,
  TIGHT_LOOP_DETECTION_DISTANCE_KM,
  TIGHT_LOOP_MAX_DIAMETER_KM,
  TIGHT_LOOP_MIN_TOTAL_TURN_DEGREES,
  DRAMATIC_TURN_RATE,
} from './config';

export {
  formatFlyoverDistance,
  formatFlyoverElevation,
  formatFlyoverLiveStreamMetric,
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
  FLYOVER_INTRO_MAX_PULLBACK_ALTITUDE,
  FLYOVER_INTRO_MIN_PULLBACK_ALTITUDE,
  FLYOVER_INTRO_PULLBACK_METRES,
  FLYOVER_INTRO_PULLBACK_PITCH,
  FLYOVER_INTRO_ROTATION_DEGREES,
  FLYOVER_OUTRO_BEARING,
  FLYOVER_OUTRO_DURATION_MS,
  FLYOVER_OUTRO_PITCH,
  FLYOVER_PITCH,
  FLYOVER_PROGRESS_UPDATE_MS,
  FLYOVER_ROUTE_GRADIENT,
  FLYOVER_SPEEDS,
  FLYOVER_TILE_WAIT_MS,
  FLYOVER_ZOOM,
  SATELLITE_FLYOVER_ROUTE_GRADIENT,
} from './config';

export const clamp = (value, min, max) => {
  return Math.min(Math.max(value, min), max);
};

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

export const easeCubicInOut = (progress) => {
  const clampedProgress = clamp(progress, 0, 1);

  return clampedProgress < 0.5
    ? 4 * Math.pow(clampedProgress, 3)
    : 1 - Math.pow(-2 * clampedProgress + 2, 3) / 2;
};

const areSameCoordinate = (firstCoordinate, secondCoordinate) => {
  return (
    firstCoordinate?.[0] === secondCoordinate?.[0] &&
    firstCoordinate?.[1] === secondCoordinate?.[1]
  );
};

export const isValidLngLatCoordinate = (coordinate) => {
  return (
    Array.isArray(coordinate) &&
    Number.isFinite(coordinate[0]) &&
    Number.isFinite(coordinate[1])
  );
};

const interpolateLngLat = (fromLngLat, toLngLat, ratio) => {
  if (!isValidLngLatCoordinate(fromLngLat) || !isValidLngLatCoordinate(toLngLat)) {
    return isValidLngLatCoordinate(toLngLat) ? toLngLat : fromLngLat;
  }

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

// implement Chaikin’s Algorithm to create corner-cutting and generate smooth curves from polygonal line
const getChaikinSmoothedCoordinates = (
  coordinates,
  passes = FLYOVER_PREP_CHAIKIN_PASSES,
) => {
  if (!Array.isArray(coordinates) || coordinates.length < 3 || passes <= 0) {
    return coordinates;
  }

  const isClosedRoute = areSameCoordinate(
    coordinates[0],
    coordinates[coordinates.length - 1],
  );
  let smoothedCoordinates = coordinates;

  for (let pass = 0; pass < passes; pass += 1) {
    const nextCoordinates = isClosedRoute ? [] : [smoothedCoordinates[0]];
    const lastSegmentIndex = smoothedCoordinates.length - 1;

    for (let index = 0; index < lastSegmentIndex; index += 1) {
      const currentCoordinate = smoothedCoordinates[index];
      const nextCoordinate = smoothedCoordinates[index + 1];

      if (!currentCoordinate || !nextCoordinate) {
        continue;
      }

      nextCoordinates.push(
        interpolateLngLat(currentCoordinate, nextCoordinate, 0.25),
        interpolateLngLat(currentCoordinate, nextCoordinate, 0.75),
      );
    }

    if (isClosedRoute) {
      nextCoordinates.push(nextCoordinates[0]);
    } else {
      nextCoordinates.push(smoothedCoordinates[smoothedCoordinates.length - 1]);
    }

    smoothedCoordinates = nextCoordinates;
  }

  return smoothedCoordinates;
};

// reduce the number of coordinates from raw data to a manageable size while maintain overall shape
const sampleRouteCoordinates = (routeLine, maxCoordinates) => {
  const coordinateCount = routeLine?.geometry?.coordinates?.length || 0;

  if (!routeLine || coordinateCount <= maxCoordinates) {
    return routeLine?.geometry?.coordinates || [];
  }

  const routeDistanceKm = turf.length(routeLine, { units: 'kilometers' });

  if (!routeDistanceKm) {
    return routeLine.geometry.coordinates;
  }

  const lastIndex = maxCoordinates - 1;

  return Array.from({ length: maxCoordinates }, (_, index) => {
    const distanceKm = routeDistanceKm * (index / lastIndex);

    return turf.along(routeLine, distanceKm, {
      units: 'kilometers',
    }).geometry.coordinates;
  });
};

const getPreparedRouteProperties = (properties) => {
  if (!properties?.streams?.distance) {
    return properties;
  }

  const { distance, ...preparedStreams } = properties.streams;

  return {
    ...properties,
    streams: preparedStreams,
  };
};

/**
 * Reduces dense GPS noise before flyover playback while preserving the
 * original route data for normal static rendering and post-animation cleanup.
 * Prepared geometry intentionally drops the original distance stream so
 * playback distance is measured against the same geometry that marker/camera
 * movement follows.
 */
export const getPreparedFlyoverRouteLine = (routeLine) => {
  const coordinates = routeLine?.geometry?.coordinates;

  if (!Array.isArray(coordinates) || coordinates.length < FLYOVER_PREP_MIN_COORDINATES) {
    return routeLine;
  }

  const simplifiedRouteLine = turf.simplify(routeLine, {
    highQuality: false,
    mutate: false,
    tolerance: FLYOVER_PREP_SIMPLIFY_TOLERANCE,
  });
  const simplifiedCoordinates = simplifiedRouteLine?.geometry?.coordinates;

  if (!Array.isArray(simplifiedCoordinates) || simplifiedCoordinates.length < 2) {
    return routeLine;
  }

  const shouldSmooth = simplifiedCoordinates.length * 2 <= FLYOVER_PREP_MAX_COORDINATES;
  const preparedProperties = getPreparedRouteProperties(routeLine.properties);
  const preparedCoordinates = sampleRouteCoordinates(
    turf.lineString(
      shouldSmooth
        ? getChaikinSmoothedCoordinates(simplifiedCoordinates)
        : simplifiedCoordinates,
      preparedProperties,
    ),
    FLYOVER_PREP_MAX_COORDINATES,
  );

  return turf.lineString(preparedCoordinates, preparedProperties);
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

export const getDroneBaseZoom = ({ routeDistanceKm, streams, totalElevationGain }) => {
  const elevationGainPerKm = getElevationGainPerKm(
    routeDistanceKm,
    totalElevationGain,
    streams,
  );
  const distanceZoom =
    routeDistanceKm > 35
      ? 15.1
      : routeDistanceKm > 20
        ? 15.5
        : routeDistanceKm > 10
          ? 16.1
          : routeDistanceKm > 5
            ? 16.5
            : 17;
  const hillAdjustment =
    elevationGainPerKm >= 45
      ? -0.8
      : elevationGainPerKm >= 30
        ? -0.55
        : elevationGainPerKm >= 15
          ? -0.3
          : 0;

  return clamp(distanceZoom + hillAdjustment, 13, 17.3);
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

export const getFlyoverRouteCoordinateAtDistance = (
  routeLine,
  distanceKm,
  routeDistanceKm = null,
) => {
  const fallbackCoordinate = routeLine?.geometry?.coordinates?.find(
    isValidLngLatCoordinate,
  );

  if (!routeLine || !fallbackCoordinate) {
    return null;
  }

  const safeDistanceKm = Number.isFinite(routeDistanceKm)
    ? clamp(distanceKm, 0, routeDistanceKm)
    : Math.max(Number(distanceKm) || 0, 0);
  const coordinate = turf.along(routeLine, safeDistanceKm, {
    units: 'kilometers',
  }).geometry.coordinates;

  return isValidLngLatCoordinate(coordinate) ? coordinate : fallbackCoordinate;
};

const getPointOnRoute = (routeLine, distanceKm) => {
  return getFlyoverRouteCoordinateAtDistance(routeLine, distanceKm);
};

const clampRouteDistance = (distanceKm, routeDistanceKm) => {
  return clamp(distanceKm, 0, routeDistanceKm);
};

const getLookaheadDistance = (routeDistanceKm) => {
  return Math.min(Math.max(routeDistanceKm * 0.12, 0.45), 2.4);
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
    const coordinate = getPointOnRoute(routeLine, distance);

    if (!isValidLngLatCoordinate(coordinate)) {
      return;
    }

    const [lng, lat] = coordinate;
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
  const currentCoordinate = getPointOnRoute(routeLine, distanceKm);

  if (!isValidLngLatCoordinate(currentCoordinate)) {
    return 0;
  }

  const currentPoint = turf.point(currentCoordinate);
  const lookAheadDistance = Math.min(distanceKm + lookAheadStep, routeDistanceKm);
  const lookAheadCoordinate = getPointOnRoute(routeLine, lookAheadDistance);

  if (!isValidLngLatCoordinate(lookAheadCoordinate)) {
    return 0;
  }

  const lookAheadPoint = turf.point(lookAheadCoordinate);

  if (lookAheadDistance === distanceKm) {
    const lookBehindDistance = Math.max(distanceKm - lookAheadStep, 0);
    const lookBehindCoordinate = getPointOnRoute(routeLine, lookBehindDistance);

    if (!isValidLngLatCoordinate(lookBehindCoordinate)) {
      return 0;
    }

    const lookBehindPoint = turf.point(lookBehindCoordinate);

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

const getRouteSectionCoordinates = (routeLine, startDistanceKm, endDistanceKm) => {
  const startDistance = clamp(startDistanceKm, 0, endDistanceKm);
  const endDistance = Math.max(endDistanceKm, 0);
  const startCoordinate = getPointOnRoute(routeLine, startDistance);
  const endCoordinate = getPointOnRoute(routeLine, endDistance);

  if (!isValidLngLatCoordinate(startCoordinate) || !isValidLngLatCoordinate(endCoordinate)) {
    return routeLine?.geometry?.coordinates?.filter(isValidLngLatCoordinate) || [];
  }

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

const getBearingSpread = (bearings) => {
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

const getSectionMetrics = (coordinates) => {
  if (coordinates.length < 3) {
    return {
      bearingSpread: 0,
      sharpTurnCount: 0,
      totalTurnDegrees: 0,
    };
  }

  const bearings = coordinates.slice(1).reduce((sectionBearings, coordinate, index) => {
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
  const turnMetrics = bearings.slice(1).reduce(
    (metrics, bearing, index) => {
      const turnDegrees = Math.abs(normalizeBearingDifference(bearings[index], bearing));

      return {
        sharpTurnCount:
          metrics.sharpTurnCount +
          (turnDegrees >= COMPACT_CORNER_MIN_TURN_DEGREES ? 1 : 0),
        totalTurnDegrees: metrics.totalTurnDegrees + turnDegrees,
      };
    },
    { sharpTurnCount: 0, totalTurnDegrees: 0 },
  );

  return {
    bearingSpread: getBearingSpread(bearings),
    ...turnMetrics,
  };
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

const getRouteSectionLoopRisk = ({
  routeLine,
  startDistance,
  endDistance,
  sectionLength,
  maxDiameterKm,
  minPathToDiameterRatio,
  minBearingSpread,
  compactCornerMaxDiameterKm,
  minSharpTurnCount,
  minTotalTurnDegrees,
}) => {
  const coordinates = getRouteSectionCoordinates(routeLine, startDistance, endDistance);

  if (coordinates.length < 4) {
    return false;
  }

  const bbox = turf.bbox(turf.lineString(coordinates));
  const diagonalKm = turf.distance([bbox[0], bbox[1]], [bbox[2], bbox[3]], {
    units: 'kilometers',
  });
  const pathToDiameterRatio = sectionLength / Math.max(diagonalKm, Number.EPSILON);
  const { bearingSpread, sharpTurnCount, totalTurnDegrees } =
    getSectionMetrics(coordinates);

  return (
    (diagonalKm <= maxDiameterKm &&
      pathToDiameterRatio >= minPathToDiameterRatio &&
      bearingSpread >= minBearingSpread) ||
    (diagonalKm <= compactCornerMaxDiameterKm &&
      sharpTurnCount >= minSharpTurnCount &&
      totalTurnDegrees >= minTotalTurnDegrees &&
      bearingSpread >= minBearingSpread)
  );
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
  tightSectionDistanceKm = TIGHT_LOOP_DETECTION_DISTANCE_KM,
  tightMaxDiameterKm = TIGHT_LOOP_MAX_DIAMETER_KM,
  tightMinTotalTurnDegrees = TIGHT_LOOP_MIN_TOTAL_TURN_DEGREES,
}) => {
  if (!routeLine || !routeDistanceKm || routeDistanceKm < tightSectionDistanceKm * 0.55) {
    return false;
  }

  return [
    {
      distanceKm: tightSectionDistanceKm,
      maxDiameterKm: tightMaxDiameterKm,
      compactCornerMaxDiameterKm: tightMaxDiameterKm,
      minTotalTurnDegrees: tightMinTotalTurnDegrees,
    },
    {
      distanceKm: sectionDistanceKm,
      maxDiameterKm,
      compactCornerMaxDiameterKm,
      minTotalTurnDegrees,
    },
  ].some((windowConfig) => {
    const detectionDistanceKm = Math.min(windowConfig.distanceKm, routeDistanceKm);
    const sectionWindow = getLoopDetectionWindow(
      distanceKm,
      routeDistanceKm,
      detectionDistanceKm,
    );

    return (
      sectionWindow.sectionLength >= detectionDistanceKm * 0.65 &&
      getRouteSectionLoopRisk({
        routeLine,
        ...sectionWindow,
        maxDiameterKm: windowConfig.maxDiameterKm,
        minPathToDiameterRatio,
        minBearingSpread,
        compactCornerMaxDiameterKm: windowConfig.compactCornerMaxDiameterKm,
        minSharpTurnCount,
        minTotalTurnDegrees: windowConfig.minTotalTurnDegrees,
      })
    );
  });
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
  const safeFocusPoint = isValidLngLatCoordinate(focusPoint) ? focusPoint : currentPoint;
  if (!isValidLngLatCoordinate(currentPoint) || !isValidLngLatCoordinate(safeFocusPoint)) {
    return {
      center: routeLine?.geometry?.coordinates?.find(isValidLngLatCoordinate) || [0, 0],
      bearing: 0,
    };
  }
  const targetBearing = turf.bearing(turf.point(currentPoint), turf.point(safeFocusPoint));
  const routeBearing = getRouteBearing(routeLine, distanceKm, routeDistanceKm);
  const turnDelta = normalizeBearing(targetBearing - routeBearing);
  const cameraCenter = interpolateLngLat(
    currentPoint,
    safeFocusPoint,
    getCameraLeadRatio(turnDelta, flyoverSpeed),
  );
  const localBearing = getWeightedBearingMean([
    { bearing: targetBearing, weight: 0.7 },
    { bearing: routeBearing, weight: 0.3 },
  ]);

  return {
    center: cameraCenter,
    bearing: Number.isFinite(localBearing) ? localBearing : 0,
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

  if (
    !isValidLngLatCoordinate(startCoordinate) ||
    !isValidLngLatCoordinate(currentCoordinate)
  ) {
    return routeLine;
  }

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
  if (mapStyle === 'satellite') {
    return SATELLITE_FLYOVER_ROUTE_GRADIENT;
  }

  if (mapStyle === 'street') {
    return FLYOVER_ROUTE_GRADIENT;
  }

  return DEFAULT_FLYOVER_ROUTE_GRADIENT;
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
 * Converts elapsed playback progress into a constant distance along the route.
 */
export const getFlyoverDistanceAtProgress = (routeDistanceKm, progress) => {
  const safeRouteDistanceKm = Math.max(Number(routeDistanceKm) || 0, 0);
  const linearProgress = clamp(Number(progress) || 0, 0, 1);

  return safeRouteDistanceKm * linearProgress;
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

/**
 * Builds the per-frame flyover camera state from the existing route target,
 * center smoothing, and bearing stability helpers.
 */
export const getFlyoverCameraState = ({
  routeLine,
  distanceKm,
  routeDistanceKm,
  previousCameraPosition,
  previousBearing,
  flyoverSpeed = 1,
  isLooping = false,
}) => {
  const clampedDistance = clampRouteDistance(distanceKm, routeDistanceKm);
  const runnerPosition = getPointOnRoute(routeLine, clampedDistance);
  const cameraTarget = getFlyoverCameraTarget(
    routeLine,
    clampedDistance,
    routeDistanceKm,
    flyoverSpeed,
  );
  const cameraPosition = smoothLngLat(
    previousCameraPosition,
    cameraTarget.center,
    flyoverSpeed >= FLYOVER_HIGH_SPEED_THRESHOLD
      ? FLYOVER_HIGH_SPEED_CAMERA_CENTER_SMOOTHING
      : undefined,
  );
  const bearing = getStableBearing({
    previousBearing,
    targetBearing: cameraTarget.bearing,
    isLooping,
  });

  return {
    bearing,
    cameraPosition,
    runnerPosition,
    targetBearing: cameraTarget.bearing,
  };
};
