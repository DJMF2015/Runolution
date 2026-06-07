import polyline from '@mapbox/polyline';
import mapboxgl from 'mapbox-gl';
import * as turf from '@turf/turf';
import { getBoundsForCoordinates } from './activitiesMap';

export const DEFAULT_ACTIVITY_ROUTE_CENTER = [-3.21698, 55.89107];

/**
 * Converts a Strava summary polyline into the GeoJSON route feature used by the
 * activity detail map and flyover animation.
 */
export const getActivityLineFeature = (summaryPolyline) => {
  if (!summaryPolyline) {
    return null;
  }

  return {
    type: 'Feature',
    properties: { name: 'activity' },
    geometry: polyline.toGeoJSON(summaryPolyline),
  };
};

/**
 * Returns a route center point for initial map creation.
 * The default keeps the map stable when an activity has no usable polyline.
 */
export const getActivityRouteCenter = (data) => {
  return data ? turf.center(data).geometry.coordinates : DEFAULT_ACTIVITY_ROUTE_CENTER;
};

/**
 * Creates the Mapbox instance for a single activity route view.
 */
export const createActivityDetailMap = ({ accessToken, center, container, style }) => {
  mapboxgl.accessToken = accessToken;

  if (typeof mapboxgl.prewarm === 'function') {
    mapboxgl.prewarm();
  }

  const map = new mapboxgl.Map({
    style,
    antialias: true,
    center,
    zoom: 12,
    pitch: 0,
    bearing: 0,
    interactive: true,
    hash: false,
    projection: 'globe',
    container,
  });

  if (typeof map.setPrefetchZoomDelta === 'function') {
    map.setPrefetchZoomDelta(4);
  }

  return map;
};

/**
 * Adds the standard navigation, fullscreen and scale controls to the detail map.
 */
export const addActivityDetailMapControls = (map) => {
  map.addControl(new mapboxgl.NavigationControl());
  map.addControl(new mapboxgl.FullscreenControl());
  map.addControl(new mapboxgl.ScaleControl());
};

/**
 * Calculates responsive fitBounds padding that avoids the activity sidebar/nav.
 */
export const getRouteMapPadding = (isNavigationCollapsed) => {
  if (typeof window !== 'undefined' && window.innerWidth <= 800) {
    if (isNavigationCollapsed) {
      return { top: 116, bottom: 140, left: 54, right: 54 };
    }

    const bottomPadding = Math.min(Math.max(window.innerHeight * 0.4, 270), 370);

    return { top: 116, bottom: bottomPadding, left: 54, right: 54 };
  }

  if (isNavigationCollapsed) {
    return { top: 86, bottom: 80, left: 80, right: 80 };
  }

  return { top: 86, bottom: 80, left: 360, right: 80 };
};

/**
 * Fits the map camera around the activity route, optionally using the 3D view
 * pitch and bearing.
 */
export const fitRouteToMap = (
  map,
  coordinates,
  isThreeDimensional,
  isNavigationCollapsed,
  duration = 3000,
  cameraOptions = {},
) => {
  const bounds = getBoundsForCoordinates(coordinates);

  if (!map || !bounds) {
    return;
  }

  map.fitBounds(bounds, {
    padding: getRouteMapPadding(isNavigationCollapsed),
    duration,
    pitch: cameraOptions.pitch ?? (isThreeDimensional ? 55 : 0),
    bearing: cameraOptions.bearing ?? (isThreeDimensional ? -18 : 0),
    maxZoom: isThreeDimensional ? 15 : 16,
  });
};
