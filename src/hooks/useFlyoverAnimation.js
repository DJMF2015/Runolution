import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import * as turf from '@turf/turf';
import {
  FLYOVER_INTRO_DURATION_MS,
  FLYOVER_INTRO_MAX_PULLBACK_ALTITUDE,
  FLYOVER_INTRO_MIN_PULLBACK_ALTITUDE,
  FLYOVER_INTRO_PULLBACK_METRES,
  FLYOVER_INTRO_PULLBACK_PITCH,
  FLYOVER_INTRO_PULLBACK_PROGRESS,
  FLYOVER_OUTRO_DURATION_MS,
  FLYOVER_OUTRO_PITCH,
  FLYOVER_HIGH_SPEED_CAMERA_CENTER_SMOOTHING,
  FLYOVER_HIGH_SPEED_THRESHOLD,
  FLYOVER_PITCH,
  FLYOVER_PROGRESS_UPDATE_MS,
  FLYOVER_SPEEDS,
  FLYOVER_TILE_WAIT_MS,
  computeCameraPosition,
  createFlyoverMarkerElement,
  easeCubicOut,
  formatFlyoverElevation,
  formatFlyoverPace,
  formatFlyoverStreamAveragePace,
  formatFlyoverTotalDistance,
  detectSmallLoopSection,
  getFlyoverAltitude,
  getFlyoverCameraTarget,
  getFlyoverDuration,
  getPreparedFlyoverRouteLine,
  getFlyoverRouteCoordinates,
  getFlyoverRouteDistanceKm,
  getFlyoverZoom,
  getStableBearing,
  lerp,
  setActivityRouteData,
  setFlyoverRouteGradient,
  setFlyoverRouteProgress,
  smoothFlyoverProgress,
  smoothLngLat,
} from '../utils/flyOverHelper';

const MAX_FLYOVER_FRAME_DELTA_MS = 250;
const TERRAIN_CAMERA_CLEARANCE_METRES = 350;
const TERRAIN_ALTITUDE_SMOOTHING = 0.06;
const MIN_VALID_TERRAIN_ELEVATION_METRES = -500;
const MAX_VALID_TERRAIN_ELEVATION_METRES = 9000;
const LOOP_DETECTION_DISTANCE_BUCKET_KM = 0.05;

const clamp = (value, min, max) => {
  return Math.min(Math.max(value, min), max);
};

const easeCubicInOut = (progress) => {
  const clampedProgress = clamp(progress, 0, 1);

  return clampedProgress < 0.5
    ? 4 * Math.pow(clampedProgress, 3)
    : 1 - Math.pow(-2 * clampedProgress + 2, 3) / 2;
};

const getFlyoverIntroFrame = ({
  baseAltitude,
  baseBearing,
  progress,
}) => {
  const pullbackAltitude = clamp(
    baseAltitude + FLYOVER_INTRO_PULLBACK_METRES,
    FLYOVER_INTRO_MIN_PULLBACK_ALTITUDE,
    FLYOVER_INTRO_MAX_PULLBACK_ALTITUDE,
  );

  if (progress <= FLYOVER_INTRO_PULLBACK_PROGRESS) {
    const phaseProgress = easeCubicOut(progress / FLYOVER_INTRO_PULLBACK_PROGRESS);

    return {
      altitude: lerp(baseAltitude, pullbackAltitude, phaseProgress),
      bearing: lerp(baseBearing - 8, baseBearing - 18, phaseProgress),
      pitch: lerp(FLYOVER_PITCH, FLYOVER_INTRO_PULLBACK_PITCH, phaseProgress),
    };
  }

  const phaseProgress = easeCubicInOut(
    (progress - FLYOVER_INTRO_PULLBACK_PROGRESS) /
      (1 - FLYOVER_INTRO_PULLBACK_PROGRESS),
  );

  return {
    altitude: lerp(pullbackAltitude, baseAltitude, phaseProgress),
    bearing: lerp(baseBearing - 18, baseBearing, phaseProgress),
    pitch: lerp(FLYOVER_INTRO_PULLBACK_PITCH, FLYOVER_PITCH, phaseProgress),
  };
};

const getTerrainElevation = (map, lngLat) => {
  if (typeof map?.queryTerrainElevation !== 'function' || !lngLat) {
    return null;
  }

  const elevation = map.queryTerrainElevation([lngLat.lng, lngLat.lat]);

  return Number.isFinite(elevation) &&
    elevation >= MIN_VALID_TERRAIN_ELEVATION_METRES &&
    elevation <= MAX_VALID_TERRAIN_ELEVATION_METRES
    ? elevation
    : null;
};

const getTerrainAdjustedAltitude = ({
  altitude,
  cameraPosition,
  map,
  targetLngLat,
  terrainAltitudeRef,
}) => {
  if (!terrainAltitudeRef || !cameraPosition) {
    return altitude;
  }

  const terrainElevations = [
    getTerrainElevation(map, cameraPosition),
    getTerrainElevation(map, targetLngLat),
  ].filter(Number.isFinite);

  if (!terrainElevations.length) {
    return altitude;
  }

  const targetAltitude =
    Math.max(...terrainElevations) + TERRAIN_CAMERA_CLEARANCE_METRES;
  const previousAltitude = terrainAltitudeRef.current;
  terrainAltitudeRef.current =
    previousAltitude === null || targetAltitude > previousAltitude
      ? targetAltitude
      : lerp(previousAltitude, targetAltitude, TERRAIN_ALTITUDE_SMOOTHING);

  return Math.max(altitude, terrainAltitudeRef.current);
};

const setFlyoverFreeCamera = ({
  altitude,
  bearing,
  map,
  pitch,
  targetLngLat,
  terrainAltitudeRef,
  zoom,
}) => {
  if (
    !map ||
    typeof map.getFreeCameraOptions !== 'function' ||
    typeof map.setFreeCameraOptions !== 'function' ||
    !mapboxgl.MercatorCoordinate
  ) {
    map?.jumpTo({
      center: [targetLngLat.lng, targetLngLat.lat],
      bearing,
      pitch,
      zoom,
    });
    return;
  }

  const camera = map.getFreeCameraOptions();
  const cameraPosition = computeCameraPosition(pitch, bearing, targetLngLat, altitude);
  const adjustedAltitude = getTerrainAdjustedAltitude({
    altitude,
    cameraPosition,
    map,
    targetLngLat,
    terrainAltitudeRef,
  });
  const adjustedCameraPosition =
    adjustedAltitude === altitude
      ? cameraPosition
      : computeCameraPosition(pitch, bearing, targetLngLat, adjustedAltitude);

  camera.setPitchBearing(pitch, bearing);
  camera.position = mapboxgl.MercatorCoordinate.fromLngLat(
    adjustedCameraPosition,
    adjustedAltitude,
  );
  if (typeof camera.lookAtPoint === 'function') {
    camera.lookAtPoint([targetLngLat.lng, targetLngLat.lat]);
  }
  map.setFreeCameraOptions(camera);
};

const setFlyoverTilePrefetch = (map) => {
  if (typeof map?.setPrefetchZoomDelta === 'function') {
    map.setPrefetchZoomDelta(4);
  }
};

const waitForFlyoverTiles = (map) => {
  return new Promise((resolve) => {
    if (!map || map.loaded()) {
      resolve();
      return;
    }

    let hasResolved = false;

    const finish = () => {
      if (hasResolved) {
        return;
      }

      hasResolved = true;
      resolve();
    };

    map.once('idle', finish);
    window.setTimeout(finish, FLYOVER_TILE_WAIT_MS);
  });
};

/**
 * Coordinates the route flyover UI state, Mapbox camera movement, route
 * progress rendering and cleanup for the activity detail page.
 *
 * The geometry-specific calculations live in `flyOverHelper`; this hook owns
 * React state, timers, animation frames and Mapbox side effects.
 */
export const useFlyoverAnimation = ({
  activity,
  data,
  isActivityNavCollapsedRef,
  mapRef,
  currentMapStyleRef,
  flyoverRouteLine,
  routeCoordinates,
}) => {
  const [isFlyoverPlaying, setIsFlyoverPlaying] = useState(false);
  const [flyoverSpeed, setFlyoverSpeed] = useState(1.5);
  const [flyoverDistanceKm, setFlyoverDistanceKm] = useState(0);
  const [showFlyoverSummary, setShowFlyoverSummary] = useState(false);

  const flyoverAnimationRef = useRef(null);
  const flyoverMarkerRef = useRef(null);
  const flyoverPlaybackIdRef = useRef(0);
  const flyoverSpeedRef = useRef(1);
  const skipNextRouteFitRef = useRef(false);
  const terrainAltitudeRef = useRef(null);

  // Turf line and distance are memoized because they are used on every animation
  // frame once playback begins.
  const rawRouteLine = useMemo(() => {
    if (flyoverRouteLine?.geometry?.coordinates?.length > 1) {
      return flyoverRouteLine;
    }

    return routeCoordinates.length > 1 ? turf.lineString(routeCoordinates) : null;
  }, [flyoverRouteLine, routeCoordinates]);

  const routeLine = useMemo(() => {
    return getPreparedFlyoverRouteLine(rawRouteLine);
  }, [rawRouteLine]);

  const flyoverRouteCoordinates = useMemo(() => {
    return getFlyoverRouteCoordinates(routeLine, routeCoordinates);
  }, [routeLine, routeCoordinates]);

  const routeDistanceKm = useMemo(() => {
    return getFlyoverRouteDistanceKm(routeLine);
  }, [routeLine]);

  const flyoverAveragePace = useMemo(() => {
    return formatFlyoverPace(activity?.distance, activity?.moving_time);
  }, [activity?.distance, activity?.moving_time]);

  const flyoverLivePace = useMemo(() => {
    return formatFlyoverStreamAveragePace({
      distanceKm: flyoverDistanceKm,
      fallbackDistanceMetres: activity?.distance,
      fallbackMovingTimeSeconds: activity?.moving_time,
      streams: routeLine?.properties?.streams,
    });
  }, [
    activity?.distance,
    activity?.moving_time,
    flyoverDistanceKm,
    routeLine?.properties?.streams,
  ]);

  const flyoverTotalDistance = useMemo(() => {
    return formatFlyoverTotalDistance(activity?.distance);
  }, [activity?.distance]);

  const flyoverTotalElevation = useMemo(() => {
    return formatFlyoverElevation(activity?.total_elevation_gain);
  }, [activity?.total_elevation_gain]);

  useEffect(() => {
    flyoverSpeedRef.current = flyoverSpeed;
  }, [flyoverSpeed]);

  /**
   * Stops animation work and restores the full route line.
   * `updateState` is false during unmount so cleanup does not set React state
   * after the component is being removed.
   */
  const stopFlyover = useCallback(
    (updateState = true) => {
      if (flyoverAnimationRef.current) {
        window.cancelAnimationFrame(flyoverAnimationRef.current);
        flyoverAnimationRef.current = null;
      }

      flyoverPlaybackIdRef.current += 1;
      terrainAltitudeRef.current = null;
      flyoverMarkerRef.current?.remove();
      flyoverMarkerRef.current = null;
      setActivityRouteData(mapRef.current, data);
      setFlyoverRouteGradient(mapRef.current);

      if (updateState) {
        setFlyoverDistanceKm(0);
        setShowFlyoverSummary(false);
        setIsFlyoverPlaying(false);
      }
    },
    [data, mapRef],
  );

  /**
   * Starts the full flyover sequence: intro camera move, animation-frame loop,
   * route progress updates and outro fit back to the route.
   */
  const startFlyover = useCallback(() => {
    const map = mapRef.current;

    if (!map || !routeLine || !routeDistanceKm || flyoverRouteCoordinates.length < 2) {
      return;
    }

    stopFlyover();
    terrainAltitudeRef.current = null;
    setFlyoverDistanceKm(0);
    setShowFlyoverSummary(false);
    setFlyoverTilePrefetch(map);
    setFlyoverRouteGradient(map, currentMapStyleRef?.current);
    setFlyoverRouteProgress(map, routeLine, 0, routeDistanceKm);
    const marker = new mapboxgl.Marker({
      element: createFlyoverMarkerElement(currentMapStyleRef?.current),
      anchor: 'center',
    })
      .setLngLat(flyoverRouteCoordinates[0])
      .addTo(map);
    const playbackId = flyoverPlaybackIdRef.current + 1;
    flyoverPlaybackIdRef.current = playbackId;
    flyoverMarkerRef.current = marker;
    setIsFlyoverPlaying(true);

    const duration = getFlyoverDuration(routeDistanceKm, routeLine.properties?.streams);
    const flyoverZoom = getFlyoverZoom({
      routeDistanceKm,
      streams: routeLine.properties?.streams,
      totalElevationGain: activity?.total_elevation_gain,
    });
    const flyoverAltitude = getFlyoverAltitude({
      routeDistanceKm,
      streams: routeLine.properties?.streams,
      totalElevationGain: activity?.total_elevation_gain,
    });
    const initialCameraTarget = getFlyoverCameraTarget(
      routeLine,
      0,
      routeDistanceKm,
      flyoverSpeedRef.current,
    );
    let cameraCenter = initialCameraTarget.center;
    let cameraBearing = initialCameraTarget.bearing;
    let flyoverProgress = 0;
    let previousTimestamp = null;
    let lastRouteProgressTimestamp = 0;
    let lastDistanceStateTimestamp = 0;
    let loopDetectionBucket = null;
    let isLooping = false;

    // The frame loop advances by elapsed time rather than frame count so speed
    // remains consistent across different browser refresh rates.
    const animateFlyover = (timestamp) => {
      if (flyoverPlaybackIdRef.current !== playbackId) {
        return;
      }

      if (!previousTimestamp) {
        previousTimestamp = timestamp;
      }

      const frameDelta = Math.min(
        timestamp - previousTimestamp,
        MAX_FLYOVER_FRAME_DELTA_MS,
      );
      previousTimestamp = timestamp;
      flyoverProgress = Math.min(
        flyoverProgress + (frameDelta / duration) * flyoverSpeedRef.current,
        1,
      );

      const easedProgress = smoothFlyoverProgress(flyoverProgress);
      const distanceKm = routeDistanceKm * easedProgress;
      const markerPoint = turf.along(routeLine, distanceKm, { units: 'kilometers' });
      const markerLngLat = markerPoint.geometry.coordinates;
      const cameraTarget = getFlyoverCameraTarget(
        routeLine,
        distanceKm,
        routeDistanceKm,
        flyoverSpeedRef.current,
      );

      if (
        timestamp - lastRouteProgressTimestamp > FLYOVER_PROGRESS_UPDATE_MS ||
        flyoverProgress >= 1
      ) {
        setFlyoverRouteProgress(map, routeLine, distanceKm, routeDistanceKm);
        lastRouteProgressTimestamp = timestamp;
      }

      if (timestamp - lastDistanceStateTimestamp > 250 || flyoverProgress >= 1) {
        setFlyoverDistanceKm(distanceKm);
        lastDistanceStateTimestamp = timestamp;
      }
      marker.setLngLat(markerLngLat);

      cameraCenter = smoothLngLat(
        cameraCenter,
        cameraTarget.center,
        flyoverSpeedRef.current >= FLYOVER_HIGH_SPEED_THRESHOLD
          ? FLYOVER_HIGH_SPEED_CAMERA_CENTER_SMOOTHING
          : undefined,
      );
      const currentLoopDetectionBucket = Math.round(
        distanceKm / LOOP_DETECTION_DISTANCE_BUCKET_KM,
      );

      if (currentLoopDetectionBucket !== loopDetectionBucket) {
        loopDetectionBucket = currentLoopDetectionBucket;
        isLooping = detectSmallLoopSection({
          routeLine,
          distanceKm,
          routeDistanceKm,
        });
      }

      cameraBearing = getStableBearing({
        previousBearing: cameraBearing,
        targetBearing: cameraTarget.bearing,
        isLooping,
      });

      setFlyoverFreeCamera({
        altitude: flyoverAltitude,
        bearing: cameraBearing,
        map,
        pitch: FLYOVER_PITCH,
        targetLngLat: {
          lng: cameraCenter[0],
          lat: cameraCenter[1],
        },
        terrainAltitudeRef,
        zoom: flyoverZoom,
      });

      if (flyoverProgress < 1) {
        flyoverAnimationRef.current = window.requestAnimationFrame(animateFlyover);
        return;
      }

      flyoverAnimationRef.current = null;
      skipNextRouteFitRef.current = true;
      setActivityRouteData(map, data);
      setFlyoverRouteGradient(map);
      marker.setLngLat(flyoverRouteCoordinates[flyoverRouteCoordinates.length - 1]);
      marker.remove();
      flyoverMarkerRef.current = null;
      setFlyoverDistanceKm(routeDistanceKm);
      setShowFlyoverSummary(true);
      setIsFlyoverPlaying(false);
      map.fitBounds(turf.bbox(rawRouteLine || routeLine), {
        duration: FLYOVER_OUTRO_DURATION_MS,
        pitch: FLYOVER_OUTRO_PITCH,
        bearing: cameraBearing,
        padding: isActivityNavCollapsedRef.current ? 120 : 180,
      });
    };

    const animateIntro = (timestamp) => {
      if (flyoverPlaybackIdRef.current !== playbackId) {
        return;
      }

      if (!previousTimestamp) {
        previousTimestamp = timestamp;
      }

      const introProgress = Math.min(
        (timestamp - previousTimestamp) / FLYOVER_INTRO_DURATION_MS,
        1,
      );
      const introFrame = getFlyoverIntroFrame({
        baseAltitude: flyoverAltitude,
        baseBearing: cameraBearing,
        progress: introProgress,
      });

      setFlyoverFreeCamera({
        altitude: introFrame.altitude,
        bearing: introFrame.bearing,
        map,
        pitch: introFrame.pitch,
        targetLngLat: {
          lng: cameraCenter[0],
          lat: cameraCenter[1],
        },
        terrainAltitudeRef,
        zoom: flyoverZoom,
      });

      if (introProgress < 1) {
        flyoverAnimationRef.current = window.requestAnimationFrame(animateIntro);
        return;
      }

      previousTimestamp = null;
      flyoverAnimationRef.current = null;
      waitForFlyoverTiles(map).then(() => {
        if (
          flyoverPlaybackIdRef.current !== playbackId ||
          flyoverAnimationRef.current
        ) {
          return;
        }

        flyoverAnimationRef.current = window.requestAnimationFrame(animateFlyover);
      });
    };

    flyoverAnimationRef.current = window.requestAnimationFrame(animateIntro);
  }, [
    currentMapStyleRef,
    activity?.total_elevation_gain,
    data,
    flyoverRouteCoordinates,
    isActivityNavCollapsedRef,
    mapRef,
    routeDistanceKm,
    routeLine,
    rawRouteLine,
    stopFlyover,
  ]);

  /**
   * Moves to the next configured speed without exceeding the maximum value.
   */
  const increaseFlyoverSpeed = useCallback(() => {
    setFlyoverSpeed((currentSpeed) => {
      const currentIndex = FLYOVER_SPEEDS.indexOf(currentSpeed);
      const nextIndex = currentIndex === -1 ? 1 : currentIndex + 1;
      return FLYOVER_SPEEDS[Math.min(nextIndex, FLYOVER_SPEEDS.length - 1)];
    });
  }, []);

  /**
   * Moves to the previous configured speed without going below the minimum.
   */
  const decreaseFlyoverSpeed = useCallback(() => {
    setFlyoverSpeed((currentSpeed) => {
      const currentIndex = FLYOVER_SPEEDS.indexOf(currentSpeed);
      const nextIndex = currentIndex === -1 ? 1 : currentIndex - 1;
      return FLYOVER_SPEEDS[Math.max(nextIndex, 0)];
    });
  }, []);

  /** Dismisses flyover summary if close button selected by user */
  const dismissFlyoverSummary = useCallback(() => {
    setShowFlyoverSummary(false);
  }, []);

  /**
   * Lets the caller skip one automatic fitRouteToMap call after the flyover
   * outro already performed that camera transition.
   */
  const consumeRouteFitSkip = useCallback(() => {
    if (!skipNextRouteFitRef.current) {
      return false;
    }

    skipNextRouteFitRef.current = false;
    return true;
  }, []);

  useEffect(() => {
    return () => {
      stopFlyover(false);
    };
  }, [stopFlyover]);

  return {
    decreaseFlyoverSpeed,
    dismissFlyoverSummary,
    flyoverAveragePace,
    flyoverDistanceKm,
    flyoverLivePace,
    flyoverSpeed,
    flyoverTotalDistance,
    flyoverTotalElevation,
    increaseFlyoverSpeed,
    isFlyoverPlaying,
    isFlyoverSpeedMax: flyoverSpeed === FLYOVER_SPEEDS[FLYOVER_SPEEDS.length - 1],
    isFlyoverSpeedMin: flyoverSpeed === FLYOVER_SPEEDS[0],
    showFlyoverSummary,
    startFlyover,
    stopFlyover,
    consumeRouteFitSkip,
  };
};
