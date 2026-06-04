import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import * as turf from '@turf/turf';
import {
  FLYOVER_INTRO_DURATION_MS,
  FLYOVER_OUTRO_DURATION_MS,
  FLYOVER_OUTRO_PITCH,
  FLYOVER_PITCH,
  FLYOVER_SPEEDS,
  FLYOVER_ZOOM,
  createFlyoverMarkerElement,
  formatFlyoverElevation,
  formatFlyoverPace,
  formatFlyoverTotalDistance,
  getFlyoverCameraTarget,
  getFlyoverDuration,
  getFlyoverRouteCoordinates,
  getFlyoverRouteDistanceKm,
  setActivityRouteData,
  setFlyoverRouteGradient,
  setFlyoverRouteProgress,
  smoothBearing,
  smoothFlyoverProgress,
  smoothLngLat,
} from '../utils/flyOverHelper';

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
  fitRouteToMap,
  isActivityNavCollapsedRef,
  mapRef,
  currentMapStyleRef,
  flyoverRouteLine,
  routeCoordinates,
}) => {
  const [isFlyoverPlaying, setIsFlyoverPlaying] = useState(false);
  const [flyoverSpeed, setFlyoverSpeed] = useState(2.0);
  const [flyoverDistanceKm, setFlyoverDistanceKm] = useState(0);
  const [showFlyoverSummary, setShowFlyoverSummary] = useState(false);

  const flyoverAnimationRef = useRef(null);
  const flyoverMarkerRef = useRef(null);
  const flyoverIntroTimeoutRef = useRef(null);
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

      if (flyoverIntroTimeoutRef.current) {
        window.clearTimeout(flyoverIntroTimeoutRef.current);
        flyoverIntroTimeoutRef.current = null;
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
    const initialCameraTarget = getFlyoverCameraTarget(routeLine, 0, routeDistanceKm);
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
      const cameraTarget = getFlyoverCameraTarget(routeLine, distanceKm, routeDistanceKm);

      setFlyoverRouteProgress(map, routeLine, distanceKm, routeDistanceKm);
      setFlyoverDistanceKm(distanceKm);
      marker.setLngLat(lngLat);
      cameraCenter = smoothLngLat(cameraCenter, cameraTarget.center);
      cameraBearing = smoothBearing(cameraBearing, cameraTarget.bearing);

      map.jumpTo({
        center: cameraCenter,
        bearing: cameraBearing,
        pitch: FLYOVER_PITCH,
        zoom: FLYOVER_ZOOM,
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
      fitRouteToMap(
        map,
        flyoverRouteCoordinates,
        false,
        isActivityNavCollapsedRef.current,
        FLYOVER_OUTRO_DURATION_MS,
        {
          bearing: cameraBearing,
          pitch: FLYOVER_OUTRO_PITCH,
        },
      );
    };

    map.easeTo({
      center: cameraCenter,
      bearing: cameraBearing,
      pitch: FLYOVER_PITCH,
      zoom: FLYOVER_ZOOM,
      duration: FLYOVER_INTRO_DURATION_MS,
      essential: true,
    });

    flyoverIntroTimeoutRef.current = window.setTimeout(() => {
      flyoverIntroTimeoutRef.current = null;
      flyoverAnimationRef.current = window.requestAnimationFrame(animateFlyover);
    }, FLYOVER_INTRO_DURATION_MS);
  }, [
    currentMapStyleRef,
    data,
    fitRouteToMap,
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
