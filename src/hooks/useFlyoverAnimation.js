import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import * as turf from '@turf/turf';
// import markerProfile from '../assets/profileMarker.jpg';
import {
  FLYOVER_INTRO_START_ALTITUDE,
  FLYOVER_INTRO_DURATION_MS,
  FLYOVER_OUTRO_DURATION_MS,
  FLYOVER_OUTRO_PITCH,
  FLYOVER_HIGH_SPEED_CAMERA_CENTER_SMOOTHING,
  FLYOVER_HIGH_SPEED_THRESHOLD,
  FLYOVER_PITCH,
  FLYOVER_SPEEDS,
  FLYOVER_TILE_WAIT_MS,
  computeCameraPosition,
  createFlyoverMarkerElement,
  easeCubicOut,
  formatFlyoverElevation,
  formatFlyoverPace,
  formatFlyoverStreamAveragePace,
  formatFlyoverTotalDistance,
  getFlyoverAltitude,
  getFlyoverCameraTarget,
  getFlyoverDuration,
  getFlyoverRouteCoordinates,
  getFlyoverRouteDistanceKm,
  getFlyoverZoom,
  lerp,
  setActivityRouteData,
  setFlyoverRouteGradient,
  setFlyoverRouteProgress,
  smoothBearing,
  smoothFlyoverProgress,
  smoothLngLat,
} from '../utils/flyOverHelper';

const setFlyoverFreeCamera = ({ altitude, bearing, map, pitch, targetLngLat, zoom }) => {
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

  camera.setPitchBearing(pitch, bearing);
  camera.position = mapboxgl.MercatorCoordinate.fromLngLat(cameraPosition, altitude);
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
  const [flyoverSpeed, setFlyoverSpeed] = useState(1);
  const [flyoverDistanceKm, setFlyoverDistanceKm] = useState(0);
  const [showFlyoverSummary, setShowFlyoverSummary] = useState(false);

  const flyoverAnimationRef = useRef(null);
  const flyoverMarkerRef = useRef(null);
  const flyoverSpeedRef = useRef(1);
  const skipNextRouteFitRef = useRef(false);

  // Turf line and distance are memoized because they are used on every animation
  // frame once playback begins.
  const routeLine = useMemo(() => {
    if (flyoverRouteLine?.geometry?.coordinates?.length > 1) {
      return flyoverRouteLine;
    }

    return routeCoordinates.length > 1 ? turf.lineString(routeCoordinates) : null;
  }, [flyoverRouteLine, routeCoordinates]);

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
   * route progress updates, marker movement and outro fit back to the route.
   */
  const startFlyover = useCallback(() => {
    const map = mapRef.current;

    if (!map || !routeLine || !routeDistanceKm || flyoverRouteCoordinates.length < 2) {
      return;
    }

    stopFlyover();
    setFlyoverDistanceKm(0);
    setShowFlyoverSummary(false);
    setFlyoverTilePrefetch(map);
    setFlyoverRouteGradient(map, currentMapStyleRef?.current);
    setFlyoverRouteProgress(map, routeLine, 0, routeDistanceKm);

    const marker = new mapboxgl.Marker({
      element: createFlyoverMarkerElement(),
      anchor: 'center',
    })
      .setLngLat(flyoverRouteCoordinates[0])
      .addTo(map);

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

    // The frame loop advances by elapsed time rather than frame count so speed
    // remains consistent across different browser refresh rates.
    const animateFlyover = (timestamp) => {
      if (!previousTimestamp) {
        previousTimestamp = timestamp;
      }

      const frameDelta = Math.min(timestamp - previousTimestamp, 60);
      previousTimestamp = timestamp;
      flyoverProgress = Math.min(
        flyoverProgress + (frameDelta / duration) * flyoverSpeedRef.current,
        1,
      );

      const easedProgress = smoothFlyoverProgress(flyoverProgress);
      const distanceKm = routeDistanceKm * easedProgress;
      const point = turf.along(routeLine, distanceKm, { units: 'kilometers' });
      const lngLat = point.geometry.coordinates;
      const cameraTarget = getFlyoverCameraTarget(
        routeLine,
        distanceKm,
        routeDistanceKm,
        flyoverSpeedRef.current,
      );

      setFlyoverRouteProgress(map, routeLine, distanceKm, routeDistanceKm);
      setFlyoverDistanceKm(distanceKm);
      marker.setLngLat(lngLat);
      cameraCenter = smoothLngLat(
        cameraCenter,
        cameraTarget.center,
        flyoverSpeedRef.current >= FLYOVER_HIGH_SPEED_THRESHOLD
          ? FLYOVER_HIGH_SPEED_CAMERA_CENTER_SMOOTHING
          : undefined,
      );
      cameraBearing = smoothBearing(cameraBearing, cameraTarget.bearing);

      setFlyoverFreeCamera({
        altitude: flyoverAltitude,
        bearing: cameraBearing,
        map,
        pitch: FLYOVER_PITCH,
        targetLngLat: {
          lng: cameraCenter[0],
          lat: cameraCenter[1],
        },
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
      setFlyoverDistanceKm(routeDistanceKm);
      setShowFlyoverSummary(true);
      setIsFlyoverPlaying(false);
      map.fitBounds(turf.bbox(routeLine), {
        duration: FLYOVER_OUTRO_DURATION_MS,
        pitch: FLYOVER_OUTRO_PITCH,
        bearing: cameraBearing,
        padding: isActivityNavCollapsedRef.current ? 120 : 180,
      });
    };

    const animateIntro = (timestamp) => {
      if (!previousTimestamp) {
        previousTimestamp = timestamp;
      }

      const introProgress = Math.min(
        (timestamp - previousTimestamp) / FLYOVER_INTRO_DURATION_MS,
        1,
      );
      const easedProgress = easeCubicOut(introProgress);
      const introAltitude = lerp(
        FLYOVER_INTRO_START_ALTITUDE,
        flyoverAltitude,
        easedProgress,
      );
      const introPitch = lerp(35, FLYOVER_PITCH, easedProgress);
      const introBearing = lerp(cameraBearing - 24, cameraBearing, easedProgress);

      setFlyoverFreeCamera({
        altitude: introAltitude,
        bearing: introBearing,
        map,
        pitch: introPitch,
        targetLngLat: {
          lng: cameraCenter[0],
          lat: cameraCenter[1],
        },
        zoom: flyoverZoom,
      });

      if (introProgress < 1) {
        flyoverAnimationRef.current = window.requestAnimationFrame(animateIntro);
        return;
      }

      previousTimestamp = null;
      flyoverAnimationRef.current = null;
      waitForFlyoverTiles(map).then(() => {
        if (!flyoverMarkerRef.current || flyoverAnimationRef.current) {
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
