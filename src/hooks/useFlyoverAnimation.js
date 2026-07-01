import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import * as turf from '@turf/turf';
import {
  FLYOVER_INTRO_DURATION_MS,
  FLYOVER_INTRO_MAX_PULLBACK_ALTITUDE,
  FLYOVER_INTRO_MIN_PULLBACK_ALTITUDE,
  FLYOVER_INTRO_PULLBACK_METRES,
  FLYOVER_INTRO_PULLBACK_PITCH,
  FLYOVER_OUTRO_BEARING,
  FLYOVER_OUTRO_DURATION_MS,
  FLYOVER_OUTRO_PITCH,
  FLYOVER_PITCH,
  FLYOVER_PROGRESS_UPDATE_MS,
  FLYOVER_SPEEDS,
  FLYOVER_TILE_WAIT_MS,
  computeCameraPosition,
  createFlyoverMarkerElement,
  clamp,
  easeCubicOut,
  easeCubicInOut,
  formatFlyoverElevation,
  formatFlyoverPace,
  formatFlyoverStreamAveragePace,
  formatFlyoverTotalDistance,
  detectSmallLoopSection,
  getDroneBaseZoom,
  getFlyoverAltitude,
  getFlyoverCameraState,
  getFlyoverCameraTarget,
  getFlyoverDuration,
  getPreparedFlyoverRouteLine,
  getFlyoverRouteCoordinates,
  getFlyoverRouteDistanceKm,
  getFlyoverZoom,
  lerp,
  setActivityRouteData,
  setFlyoverRouteGradient,
  setFlyoverRouteProgress,
  smoothFlyoverProgress,
} from '../utils/flyOverHelper';

const MAX_FLYOVER_FRAME_DELTA_MS = 250;
const TERRAIN_CAMERA_CLEARANCE_METRES = 420;
const TERRAIN_OCCLUSION_SAMPLE_RATIOS = [0.2, 0.4, 0.6, 0.8];
const TERRAIN_RIDGE_CLEARANCE_RATIO = 0.55;
const TERRAIN_RIDGE_CLEARANCE_MAX_METRES = 1000;
const TERRAIN_ALTITUDE_SMOOTHING = 0.06;
const MIN_VALID_TERRAIN_ELEVATION_METRES = -500;
const MAX_VALID_TERRAIN_ELEVATION_METRES = 9000;
const LOOP_DETECTION_DISTANCE_BUCKET_KM = 0.05;
const DRONE_FLYOVER_CAMERA_MODE = 'drone';
const DRONE_CAMERA_ZOOM_LIMITS = { min: 13, max: 17.3 };
const DRONE_CAMERA_PITCH_LIMITS = { min: 45, max: 85 };
const DRONE_LOOK_AHEAD_DISTANCE_METRES = 80;
const DRONE_LONG_ROUTE_LOOK_AHEAD_DISTANCE_METRES = 130;
const DRONE_LONG_ROUTE_DISTANCE_KM = 15;
const DRONE_MOBILE_MAX_WIDTH = 640;
const DRONE_MOBILE_CAMERA_PADDING = {
  top: 110,
  bottom: 80,
  left: 30,
  right: 30,
};
const DRONE_DESKTOP_CAMERA_PADDING = {
  top: 170,
  bottom: 70,
  left: 60,
  right: 60,
};
const DRONE_CLIMB_ANGLE_SMOOTHING = 0.06;
const DRONE_PITCH_SMOOTHING = 0.05;
const DRONE_ZOOM_SMOOTHING = 0.05;
const DRONE_BEARING_SMOOTHING = 0.055;
const DRONE_HIGH_RISK_BEARING_SMOOTHING = 0.025;
const DRONE_CENTER_SMOOTHING = 0.12;
const DRONE_HIGH_RISK_CENTER_SMOOTHING = 0.06;
const DRONE_MAX_TERRAIN_ZOOM_REDUCTION = 0.85;
const DRONE_MAX_TERRAIN_PITCH_REDUCTION = 8;

const getIsMobileViewport = () => {
  return typeof window !== 'undefined' && window.innerWidth < DRONE_MOBILE_MAX_WIDTH;
};

const normalizeBearingDifference = (fromBearing, toBearing) => {
  return ((((toBearing - fromBearing + 180) % 360) + 360) % 360) - 180;
};

const smoothDroneBearing = (previousBearing, targetBearing, smoothingRatio) => {
  if (!Number.isFinite(previousBearing)) {
    return targetBearing;
  }

  return (
    previousBearing +
    normalizeBearingDifference(previousBearing, targetBearing) * smoothingRatio
  );
};

const smoothDroneCenter = (previousCenter, targetCenter, smoothingRatio) => {
  if (!previousCenter) {
    return targetCenter;
  }

  return [
    lerp(previousCenter[0], targetCenter[0], smoothingRatio),
    lerp(previousCenter[1], targetCenter[1], smoothingRatio),
  ];
};

const interpolateBearing = (startBearing, endBearing, ratio) => {
  return startBearing + normalizeBearingDifference(startBearing, endBearing) * ratio;
};

const interpolateCoordinate = (startCoordinate, endCoordinate, ratio) => {
  return [
    lerp(startCoordinate[0], endCoordinate[0], ratio),
    lerp(startCoordinate[1], endCoordinate[1], ratio),
  ];
};

const getMapCameraSnapshot = (map, fallbackCenter, fallbackZoom) => {
  const center = typeof map?.getCenter === 'function' ? map.getCenter() : null;

  return {
    bearing: typeof map?.getBearing === 'function' ? map.getBearing() : 0,
    center: center ? [center.lng, center.lat] : fallbackCenter,
    pitch: typeof map?.getPitch === 'function' ? map.getPitch() : 0,
    zoom: typeof map?.getZoom === 'function' ? map.getZoom() : fallbackZoom,
  };
};

const getRouteCoordinateAtDistance = (routeLine, distanceKm, routeDistanceKm) => {
  return turf.along(routeLine, clamp(distanceKm, 0, routeDistanceKm), {
    units: 'kilometers',
  }).geometry.coordinates;
};

const getDroneCameraFrame = ({ pitch, zoom }) => {
  const safeZoom = clamp(
    zoom,
    DRONE_CAMERA_ZOOM_LIMITS.min,
    DRONE_CAMERA_ZOOM_LIMITS.max,
  );
  const safePitch = clamp(
    pitch,
    DRONE_CAMERA_PITCH_LIMITS.min,
    DRONE_CAMERA_PITCH_LIMITS.max,
  );
  return {
    pitch: safePitch,
    zoom: safeZoom,
  };
};

const getFlyoverIntroFrame = ({
  baseAltitude,
  baseBearing,
  basePitch = FLYOVER_PITCH,
  progress,
}) => {
  const pullbackAltitude = clamp(
    baseAltitude + FLYOVER_INTRO_PULLBACK_METRES,
    FLYOVER_INTRO_MIN_PULLBACK_ALTITUDE,
    FLYOVER_INTRO_MAX_PULLBACK_ALTITUDE,
  );
  const phaseProgress = easeCubicInOut(progress);

  return {
    altitude: lerp(pullbackAltitude, baseAltitude, phaseProgress),
    bearing: lerp(FLYOVER_OUTRO_BEARING, baseBearing, phaseProgress),
    pitch: lerp(FLYOVER_INTRO_PULLBACK_PITCH, basePitch, phaseProgress),
  };
};

const easeToNorthFacingOutro = ({ bounds, isNavigationCollapsed, map }) => {
  const padding = isNavigationCollapsed ? 120 : 180;
  const cameraOptions =
    typeof map?.cameraForBounds === 'function'
      ? map.cameraForBounds(bounds, { padding })
      : null;

  if (cameraOptions && typeof map?.easeTo === 'function') {
    map.easeTo({
      ...cameraOptions,
      duration: FLYOVER_OUTRO_DURATION_MS,
      easing: easeCubicOut,
      bearing: FLYOVER_OUTRO_BEARING,
      pitch: FLYOVER_OUTRO_PITCH,
    });
    return;
  }

  map.fitBounds(bounds, {
    duration: FLYOVER_OUTRO_DURATION_MS,
    pitch: FLYOVER_OUTRO_PITCH,
    bearing: FLYOVER_OUTRO_BEARING,
    padding,
  });

  if (typeof map?.setBearing === 'function') {
    map.once('moveend', () => {
      map.setBearing(FLYOVER_OUTRO_BEARING);
    });
  }
};

const getTerrainElevation = (map, lngLat) => {
  if (typeof map?.queryTerrainElevation !== 'function' || !lngLat) {
    return null;
  }

  const coordinate = Array.isArray(lngLat) ? lngLat : [lngLat.lng, lngLat.lat];
  const elevation = map.queryTerrainElevation(coordinate, {
    exaggerated: false,
  });

  return Number.isFinite(elevation) &&
    elevation >= MIN_VALID_TERRAIN_ELEVATION_METRES &&
    elevation <= MAX_VALID_TERRAIN_ELEVATION_METRES
    ? elevation
    : null;
};

const getInterpolatedLngLat = (start, end, ratio) => ({
  lng: lerp(start.lng, end.lng, ratio),
  lat: lerp(start.lat, end.lat, ratio),
});

const getLineOfSightTerrainElevations = ({ cameraPosition, map, targetLngLat }) => {
  const samplePoints = [
    cameraPosition,
    ...TERRAIN_OCCLUSION_SAMPLE_RATIOS.map((ratio) =>
      getInterpolatedLngLat(cameraPosition, targetLngLat, ratio),
    ),
    targetLngLat,
  ];

  return samplePoints
    .map((point) => getTerrainElevation(map, point))
    .filter(Number.isFinite);
};

const getTerrainClearance = (
  terrainElevations,
  clearanceMetres = TERRAIN_CAMERA_CLEARANCE_METRES,
) => {
  const highestTerrainElevation = Math.max(...terrainElevations);
  const lowestTerrainElevation = Math.min(...terrainElevations);
  const ridgeClearance = clamp(
    (highestTerrainElevation - lowestTerrainElevation) * TERRAIN_RIDGE_CLEARANCE_RATIO,
    0,
    TERRAIN_RIDGE_CLEARANCE_MAX_METRES,
  );

  return highestTerrainElevation + clearanceMetres + ridgeClearance;
};

const getTerrainAdjustedAltitude = ({
  altitude,
  cameraPosition,
  clearanceMetres = TERRAIN_CAMERA_CLEARANCE_METRES,
  map,
  targetLngLat,
  terrainAltitudeRef,
}) => {
  if (!terrainAltitudeRef || !cameraPosition) {
    return altitude;
  }

  const terrainElevations = getLineOfSightTerrainElevations({
    cameraPosition,
    map,
    targetLngLat,
  });

  if (!terrainElevations.length) {
    return altitude;
  }

  const targetAltitude = getTerrainClearance(terrainElevations, clearanceMetres);
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
  cameraLngLat,
  map,
  pitch,
  targetLngLat,
  terrainAltitudeRef,
  terrainClearanceMetres,
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
  const cameraPosition =
    cameraLngLat || computeCameraPosition(pitch, bearing, targetLngLat, altitude);
  const adjustedAltitude = getTerrainAdjustedAltitude({
    altitude,
    cameraPosition,
    clearanceMetres: terrainClearanceMetres,
    map,
    targetLngLat,
    terrainAltitudeRef,
  });
  const adjustedCameraPosition =
    adjustedAltitude === altitude
      ? cameraPosition
      : cameraLngLat ||
        computeCameraPosition(pitch, bearing, targetLngLat, adjustedAltitude);

  camera.position = mapboxgl.MercatorCoordinate.fromLngLat(
    adjustedCameraPosition,
    adjustedAltitude,
  );

  if (cameraLngLat) {
    // Drone mode keeps a fixed forward pitch; lookAtPoint would override it.
    camera.setPitchBearing(pitch, bearing);
  } else if (typeof camera.lookAtPoint === 'function') {
    camera.lookAtPoint([targetLngLat.lng, targetLngLat.lat]);
  } else {
    camera.setPitchBearing(pitch, bearing);
  }

  map.setFreeCameraOptions(camera);
};

const getTerrainAwareDroneFrame = ({
  bearing,
  basePitch,
  baseZoom,
  distanceKm,
  map,
  refs,
  routeDistanceKm,
  routeLine,
}) => {
  const lookAheadMeters =
    routeDistanceKm > DRONE_LONG_ROUTE_DISTANCE_KM
      ? DRONE_LONG_ROUTE_LOOK_AHEAD_DISTANCE_METRES
      : DRONE_LOOK_AHEAD_DISTANCE_METRES;
  const markerCoord = getRouteCoordinateAtDistance(
    routeLine,
    distanceKm,
    routeDistanceKm,
  );
  const lookAheadCoord = getRouteCoordinateAtDistance(
    routeLine,
    distanceKm + lookAheadMeters / 1000,
    routeDistanceKm,
  );
  const farAheadCoord = getRouteCoordinateAtDistance(
    routeLine,
    distanceKm + (lookAheadMeters * 2) / 1000,
    routeDistanceKm,
  );
  const markerElevation = getTerrainElevation(map, markerCoord);
  const lookAheadElevation = getTerrainElevation(map, lookAheadCoord);
  const farAheadElevation = getTerrainElevation(map, farAheadCoord);
  const hasNearTerrain =
    Number.isFinite(markerElevation) && Number.isFinite(lookAheadElevation);
  const safeMarkerElevation = markerElevation ?? 0;
  const safeLookAheadElevation = lookAheadElevation ?? safeMarkerElevation;
  const safeFarAheadElevation = farAheadElevation ?? safeLookAheadElevation;
  const climbAngleDegrees =
    hasNearTerrain
      ? Math.atan2(safeLookAheadElevation - safeMarkerElevation, lookAheadMeters) *
        (180 / Math.PI)
      : refs.climbAngle.current ?? 0;

  refs.climbAngle.current = lerp(
    refs.climbAngle.current ?? 0,
    climbAngleDegrees,
    DRONE_CLIMB_ANGLE_SMOOTHING,
  );

  const smoothedClimbAngle = refs.climbAngle.current;
  const ascentAdjustment =
    smoothedClimbAngle > 0
      ? clamp(smoothedClimbAngle * 0.8, 0, 12)
      : clamp(smoothedClimbAngle * 0.35, -8, 0);
  const nearGradient = safeLookAheadElevation - safeMarkerElevation;
  const farGradient = safeFarAheadElevation - safeLookAheadElevation;
  const climbIsLevelling = nearGradient > 0 && farGradient < nearGradient * 0.4;
  const summitAdjustment = climbIsLevelling ? -5 : 0;
  const pitchRisk = clamp(
    (basePitch - 66) / (DRONE_CAMERA_PITCH_LIMITS.max - 66),
    0,
    1,
  );
  const zoomRisk = clamp(
    (baseZoom - 15.4) / (DRONE_CAMERA_ZOOM_LIMITS.max - 15.4),
    0,
    1,
  );
  const terrainRisk = clamp(Math.abs(smoothedClimbAngle) / 14, 0, 1);
  const descentRisk = clamp(-smoothedClimbAngle / 10, 0, 1);
  const framingRisk = clamp(
    terrainRisk * 0.55 + pitchRisk * 0.25 + zoomRisk * 0.2 + descentRisk * 0.2,
    0,
    1,
  );
  const safeMaxPitch =
    DRONE_CAMERA_PITCH_LIMITS.max - framingRisk * DRONE_MAX_TERRAIN_PITCH_REDUCTION;
  const targetPitch = clamp(
    basePitch + ascentAdjustment + summitAdjustment,
    DRONE_CAMERA_PITCH_LIMITS.min,
    safeMaxPitch,
  );

  refs.pitch.current = lerp(
    refs.pitch.current ?? targetPitch,
    targetPitch,
    DRONE_PITCH_SMOOTHING,
  );
  refs.center.current = smoothDroneCenter(
    refs.center.current,
    lookAheadCoord,
    lerp(DRONE_CENTER_SMOOTHING, DRONE_HIGH_RISK_CENTER_SMOOTHING, framingRisk),
  );
  refs.bearing.current = smoothDroneBearing(
    refs.bearing.current,
    bearing,
    lerp(DRONE_BEARING_SMOOTHING, DRONE_HIGH_RISK_BEARING_SMOOTHING, framingRisk),
  );
  const targetZoom = clamp(
    baseZoom - framingRisk * DRONE_MAX_TERRAIN_ZOOM_REDUCTION,
    DRONE_CAMERA_ZOOM_LIMITS.min,
    DRONE_CAMERA_ZOOM_LIMITS.max,
  );
  refs.zoom.current = lerp(
    refs.zoom.current ?? targetZoom,
    targetZoom,
    DRONE_ZOOM_SMOOTHING,
  );

  return {
    bearing: refs.bearing.current,
    center: refs.center.current,
    climbIsLevelling,
    framingRisk,
    lookAheadMeters,
    pitch: refs.pitch.current,
    zoom: refs.zoom.current,
  };
};

const setTerrainAwareDroneCamera = ({ droneFrame, map }) => {
  if (typeof map?.jumpTo !== 'function') {
    return;
  }

  map.jumpTo({
    center: droneFrame.center,
    zoom: droneFrame.zoom,
    pitch: droneFrame.pitch,
    bearing: droneFrame.bearing,
    padding: getIsMobileViewport()
      ? DRONE_MOBILE_CAMERA_PADDING
      : DRONE_DESKTOP_CAMERA_PADDING,
  });
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
  flyoverCameraMode = 'cinematic',
  droneCameraPitch = 60,
  droneCameraZoom,
  flyoverRouteLine,
  routeCoordinates,
}) => {
  const [isFlyoverPlaying, setIsFlyoverPlaying] = useState(false);
  const [flyoverSpeed, setFlyoverSpeed] = useState(0.5);
  const [flyoverDistanceKm, setFlyoverDistanceKm] = useState(0);
  const [showFlyoverSummary, setShowFlyoverSummary] = useState(false);

  const flyoverAnimationRef = useRef(null);
  const flyoverMarkerRef = useRef(null);
  const flyoverPlaybackIdRef = useRef(0);
  const flyoverSpeedRef = useRef(1);
  const flyoverCameraSettingsRef = useRef({
    mode: flyoverCameraMode,
    dronePitch: droneCameraPitch,
    droneZoom: droneCameraZoom,
  });
  const droneTerrainRefs = useRef({
    bearing: { current: null },
    center: { current: null },
    climbAngle: { current: 0 },
    pitch: { current: null },
    zoom: { current: null },
  });
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

  useEffect(() => {
    const previousMode = flyoverCameraSettingsRef.current.mode;
    const previousDronePitch = flyoverCameraSettingsRef.current.dronePitch;
    const previousDroneZoom = flyoverCameraSettingsRef.current.droneZoom;
    flyoverCameraSettingsRef.current = {
      mode: flyoverCameraMode,
      dronePitch: droneCameraPitch,
      droneZoom: droneCameraZoom,
    };

    if (previousMode !== flyoverCameraMode) {
      terrainAltitudeRef.current = null;
      droneTerrainRefs.current.bearing.current = null;
      droneTerrainRefs.current.center.current = null;
      droneTerrainRefs.current.climbAngle.current = 0;
      droneTerrainRefs.current.pitch.current = null;
      droneTerrainRefs.current.zoom.current = null;
      return;
    }

    if (
      previousDronePitch !== droneCameraPitch ||
      previousDroneZoom !== droneCameraZoom
    ) {
      terrainAltitudeRef.current = null;
    }
  }, [droneCameraPitch, droneCameraZoom, flyoverCameraMode]);

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
      droneTerrainRefs.current.bearing.current = null;
      droneTerrainRefs.current.center.current = null;
      droneTerrainRefs.current.climbAngle.current = 0;
      droneTerrainRefs.current.pitch.current = null;
      droneTerrainRefs.current.zoom.current = null;
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
    droneTerrainRefs.current.bearing.current = null;
    droneTerrainRefs.current.center.current = null;
    droneTerrainRefs.current.climbAngle.current = 0;
    droneTerrainRefs.current.pitch.current = null;
    droneTerrainRefs.current.zoom.current = null;
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
    const droneBaseZoom = getDroneBaseZoom({
      routeDistanceKm,
      streams: routeLine.properties?.streams,
      totalElevationGain: activity?.total_elevation_gain,
    });
    const flyoverAltitude = getFlyoverAltitude({
      routeDistanceKm,
      streams: routeLine.properties?.streams,
      totalElevationGain: activity?.total_elevation_gain,
    });
    const initialCameraSettings = flyoverCameraSettingsRef.current;
    const initialDroneFrame = getDroneCameraFrame({
      pitch: initialCameraSettings.dronePitch,
      zoom: initialCameraSettings.droneZoom || droneBaseZoom,
    });
    const initialAltitude = flyoverAltitude;
    const initialPitch =
      initialCameraSettings.mode === DRONE_FLYOVER_CAMERA_MODE
        ? initialDroneFrame.pitch
        : FLYOVER_PITCH;
    const initialCameraTarget = getFlyoverCameraTarget(
      routeLine,
      0,
      routeDistanceKm,
      flyoverSpeedRef.current,
    );
    const introStartCamera = getMapCameraSnapshot(
      map,
      initialCameraTarget.center,
      flyoverZoom,
    );
    const droneIntroRefs = {
      bearing: { current: null },
      center: { current: null },
      climbAngle: { current: 0 },
      pitch: { current: null },
      zoom: { current: null },
    };
    const initialDroneCameraFrame =
      initialCameraSettings.mode === DRONE_FLYOVER_CAMERA_MODE
        ? getTerrainAwareDroneFrame({
            bearing: initialCameraTarget.bearing,
            basePitch: initialDroneFrame.pitch,
            baseZoom: initialDroneFrame.zoom,
            distanceKm: 0,
            map,
            refs: droneIntroRefs,
            routeDistanceKm,
            routeLine,
          })
        : null;
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

      const cameraSettings = flyoverCameraSettingsRef.current;
      const isDroneCamera = cameraSettings.mode === DRONE_FLYOVER_CAMERA_MODE;
      const droneFrame = isDroneCamera
        ? getDroneCameraFrame({
            pitch: cameraSettings.dronePitch,
            zoom: cameraSettings.droneZoom || droneBaseZoom,
          })
        : null;
      const cameraState = getFlyoverCameraState({
        routeLine,
        distanceKm,
        routeDistanceKm,
        previousCameraPosition: cameraCenter,
        previousBearing: cameraBearing,
        flyoverSpeed: flyoverSpeedRef.current,
        isLooping: isDroneCamera ? false : isLooping,
      });
      cameraCenter = cameraState.cameraPosition;
      cameraBearing = cameraState.bearing;
      marker.setLngLat(cameraState.runnerPosition);

      if (isDroneCamera) {
        const terrainAwareDroneFrame = getTerrainAwareDroneFrame({
          bearing: cameraBearing,
          basePitch: droneFrame.pitch,
          baseZoom: droneFrame.zoom,
          distanceKm,
          map,
          refs: droneTerrainRefs.current,
          routeDistanceKm,
          routeLine,
        });

        setTerrainAwareDroneCamera({
          droneFrame: terrainAwareDroneFrame,
          map,
        });
      } else {
        setFlyoverFreeCamera({
          altitude: flyoverAltitude,
          bearing: cameraBearing,
          map,
          pitch: FLYOVER_PITCH,
          targetLngLat: {
            lng: cameraState.cameraPosition[0],
            lat: cameraState.cameraPosition[1],
          },
          terrainAltitudeRef,
          zoom: flyoverZoom,
        });
      }

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
      easeToNorthFacingOutro({
        bounds: turf.bbox(rawRouteLine || routeLine),
        isNavigationCollapsed: isActivityNavCollapsedRef.current,
        map,
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
      const easedIntroProgress = easeCubicInOut(introProgress);
      const introFrame = getFlyoverIntroFrame({
        baseAltitude: initialAltitude,
        baseBearing: cameraBearing,
        basePitch: initialPitch,
        progress: introProgress,
      });

      if (initialCameraSettings.mode === DRONE_FLYOVER_CAMERA_MODE) {
        setTerrainAwareDroneCamera({
          droneFrame: {
            ...initialDroneCameraFrame,
            bearing: interpolateBearing(
              introStartCamera.bearing,
              initialDroneCameraFrame.bearing,
              easedIntroProgress,
            ),
            center: interpolateCoordinate(
              introStartCamera.center,
              initialDroneCameraFrame.center,
              easedIntroProgress,
            ),
            pitch: lerp(
              introStartCamera.pitch,
              initialDroneCameraFrame.pitch,
              easedIntroProgress,
            ),
            zoom: lerp(
              introStartCamera.zoom,
              initialDroneCameraFrame.zoom,
              easedIntroProgress,
            ),
          },
          map,
        });
      } else {
        const introCenter = interpolateCoordinate(
          introStartCamera.center,
          cameraCenter,
          easedIntroProgress,
        );

        setFlyoverFreeCamera({
          altitude: introFrame.altitude,
          bearing: interpolateBearing(
            introStartCamera.bearing,
            cameraBearing,
            easedIntroProgress,
          ),
          map,
          pitch: lerp(introStartCamera.pitch, introFrame.pitch, easedIntroProgress),
          targetLngLat: {
            lng: introCenter[0],
            lat: introCenter[1],
          },
          terrainAltitudeRef,
          zoom: lerp(introStartCamera.zoom, flyoverZoom, easedIntroProgress),
        });
      }

      if (introProgress < 1) {
        flyoverAnimationRef.current = window.requestAnimationFrame(animateIntro);
        return;
      }

      if (initialCameraSettings.mode === DRONE_FLYOVER_CAMERA_MODE) {
        droneTerrainRefs.current.bearing.current = initialDroneCameraFrame.bearing;
        droneTerrainRefs.current.center.current = initialDroneCameraFrame.center;
        droneTerrainRefs.current.climbAngle.current = droneIntroRefs.climbAngle.current;
        droneTerrainRefs.current.pitch.current = initialDroneCameraFrame.pitch;
        droneTerrainRefs.current.zoom.current = initialDroneCameraFrame.zoom;
      }

      previousTimestamp = null;
      flyoverAnimationRef.current = null;
      waitForFlyoverTiles(map).then(() => {
        if (flyoverPlaybackIdRef.current !== playbackId || flyoverAnimationRef.current) {
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
