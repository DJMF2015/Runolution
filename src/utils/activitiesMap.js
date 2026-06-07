import polyline from '@mapbox/polyline';
import mapboxgl from 'mapbox-gl';
import { formattedDate } from './conversion';
import { ACTIVITY_DETAIL_MAP_STYLES } from '../utils/mapStyles';

export const EMPTY_FEATURE_COLLECTION = {
  type: 'FeatureCollection',
  features: [],
};

export const DEFAULT_MAP_CENTER = [-3.21698, 55.89107];
export const DEFAULT_MAP_ZOOM = 10;
export const MIN_ACTIVITY_ZOOM = 8;
export const MAX_ACTIVITY_ZOOM = 13;
export const MAX_SIDEBAR_RESULTS = 80;
export const ACTIVITIES_SOURCE_ID = 'activities';
export const ACTIVITIES_LINE_LAYER_ID = 'activities-lines';

/**
 * Builds a Mapbox bounds object around a set of route coordinates.
 *
 * @param {Array<[number, number]>} coordinates - Longitude/latitude pairs.
 * @returns {mapboxgl.LngLatBounds|null} Bounds for map fitting, or null with no data.
 */
export const getBoundsForCoordinates = (coordinates) => {
  if (coordinates.length === 0) {
    return null;
  }

  return coordinates.reduce(
    (bounds, coordinate) => bounds.extend(coordinate),
    new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]),
  );
};

/**
 * Converts stored Strava activities into lightweight map route records.
 * Invalid or single-point polylines are filtered out because Mapbox line layers
 * need at least two coordinates to render a visible route.
 */
export const getDataPolylines = (activities) => {
  return activities
    .filter((activity) => activity?.map?.summary_polyline)
    .map((activity) => {
      const activityPositions = polyline.decode(activity.map.summary_polyline);

      return {
        activityPositions,
        activityCoordinates: activityPositions.map(([lat, lng]) => [lng, lat]),
        activityName: activity.name,
        activityDate: formattedDate(activity.start_date_local),
        activityType: activity.type || activity.sport_type,
        activityId: activity.id,
      };
    })
    .filter((activity) => activity.activityCoordinates.length > 1);
};

/**
 * Filters decoded activity route records by text and sport type.
 */
export const filterMapActivities = (activities, searchText, sportType) => {
  const normalizedSearch = searchText.trim().toLowerCase();

  return activities.filter((activity) => {
    const matchesName =
      !normalizedSearch || activity.activityName.toLowerCase().includes(normalizedSearch);
    const matchesSport = !sportType || activity.activityType === sportType;

    return matchesName && matchesSport;
  });
};

/**
 * Creates the GeoJSON collection consumed by the activities Mapbox source.
 */
export const getRouteFeatureCollection = (activities) => ({
  type: 'FeatureCollection',
  features: activities.map((activity) => ({
    type: 'Feature',
    properties: {
      activityId: activity.activityId,
      activityName: activity.activityName,
      activityDate: activity.activityDate,
      activityType: activity.activityType,
    },
    geometry: {
      type: 'LineString',
      coordinates: activity.activityCoordinates,
    },
  })),
});

/**
 * Flattens a feature collection into the coordinate list used for camera fitting.
 */
export const getRouteCoordinates = (featureCollection) => {
  return featureCollection.features.flatMap((feature) => feature.geometry.coordinates);
};

/**
 * Returns the camera options for 2D versus 3D activities map mode.
 */
export const getMapViewCamera = (isThreeDimensional) => ({
  pitch: isThreeDimensional ? 55 : 0,
});

/**
 * Creates the shared activities overview Mapbox instance.
 */
export const createActivitiesMap = ({ container, accessToken }) => {
  mapboxgl.accessToken = accessToken;

  return new mapboxgl.Map({
    container,
    style: ACTIVITY_DETAIL_MAP_STYLES.street,
    center: DEFAULT_MAP_CENTER,
    zoom: DEFAULT_MAP_ZOOM,
    pitch: 0,
    bearing: 0,
    antialias: true,
    projection: 'mercator',
  });
};

/**
 * Creates a popup instance for activity route hover/click interactions.
 */
export const createActivityPopup = () => {
  return new mapboxgl.Popup({
    closeButton: true,
    closeOnClick: true,
    maxWidth: '280px',
  });
};

/**
 * Adds the standard controls used on the activities overview map.
 */
export const addActivitiesMapControls = (map) => {
  map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-right');
  map.addControl(new mapboxgl.FullscreenControl(), 'top-right');
  map.addControl(new mapboxgl.ScaleControl(), 'bottom-left');
  map.addControl(
    new mapboxgl.GeolocateControl({ showUserLocation: true }, 'bottom-left'),
  );
};

/**
 * Updates the activities GeoJSON source after a style reload or filter change.
 */
export const setActivitiesSourceData = (map, featureCollection) => {
  const source = map?.getSource(ACTIVITIES_SOURCE_ID);

  if (source) {
    source.setData(featureCollection);
  }
};

/**
 * Wires pointer and popup behavior for the activities line layer.
 * This is separated from layer creation because Mapbox removes layers/sources
 * when styles change, but event bindings should be attached only once.
 */
export const bindActivityLineInteractions = (map, popupRef) => {
  map.on('mouseenter', ACTIVITIES_LINE_LAYER_ID, () => {
    map.getCanvas().style.cursor = 'pointer';
  });

  map.on('mouseleave', ACTIVITIES_LINE_LAYER_ID, () => {
    map.getCanvas().style.cursor = '';
  });

  map.on('click', ACTIVITIES_LINE_LAYER_ID, (event) => {
    const feature = event.features?.[0];
    const coordinates = event.lngLat;

    if (!feature || !popupRef.current) {
      return;
    }

    popupRef.current
      .setLngLat(coordinates)
      .setDOMContent(createActivityPopupContent(feature.properties))
      .addTo(map);
  });
};

/**
 * Calculates a responsive camera fit for all currently rendered route features.
 */
export const getActivitiesCameraForFeatureCollection = (
  map,
  featureCollection,
  windowWidth,
) => {
  const coordinates = getRouteCoordinates(featureCollection);

  if (coordinates.length === 0) {
    return null;
  }

  const bounds = getBoundsForCoordinates(coordinates);

  if (!bounds) {
    return null;
  }

  return map.cameraForBounds(bounds, {
    padding: {
      top: 90,
      right: 60,
      bottom: 60,
      left: windowWidth < 785 ? 40 : 280,
    },
    maxZoom: MAX_ACTIVITY_ZOOM,
  });
};

/**
 * Pushes current route data into Mapbox and returns the corresponding camera fit.
 */
export const updateActivitiesMapData = (map, featureCollection, windowWidth) => {
  setActivitiesSourceData(map, featureCollection);
  return getActivitiesCameraForFeatureCollection(map, featureCollection, windowWidth);
};

/**
 * Creates DOM content for the activity popup without using React rendering.
 * Mapbox popups accept native nodes, so this keeps popup creation independent
 * from the component tree.
 */
export const createActivityPopupContent = ({
  activityId,
  activityName,
  activityDate,
  activityType,
}) => {
  const popupContent = document.createElement('div');
  const popupTitle = document.createElement('strong');
  const popupMeta = document.createElement('div');
  const popupLink = document.createElement('a');

  popupTitle.textContent = activityName;
  popupMeta.textContent = `${activityDate} ${activityType}`;
  popupLink.href = `https://www.strava.com/activities/${activityId}`;
  popupLink.target = '_blank';
  popupLink.rel = 'noreferrer';
  popupLink.textContent = 'View on Strava';

  popupContent.appendChild(popupTitle);
  popupContent.appendChild(document.createElement('br'));
  popupContent.appendChild(popupMeta);
  popupContent.appendChild(popupLink);

  return popupContent;
};
