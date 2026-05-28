import polyline from '@mapbox/polyline';
import mapboxgl from 'mapbox-gl';
import { formattedDate } from './conversion';

export const EMPTY_FEATURE_COLLECTION = {
  type: 'FeatureCollection',
  features: [],
};

export const MAP_STYLES = {
  street: 'mapbox://styles/mapbox/streets-v12',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
};

export const DEFAULT_MAP_CENTER = [-3.21698, 55.89107];
export const DEFAULT_MAP_ZOOM = 10;
export const MIN_ACTIVITY_ZOOM = 8;
export const MAX_ACTIVITY_ZOOM = 13;
export const MAX_SIDEBAR_RESULTS = 80;

export const getBoundsForCoordinates = (coordinates) => {
  if (coordinates.length === 0) {
    return null;
  }

  return coordinates.reduce(
    (bounds, coordinate) => bounds.extend(coordinate),
    new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]),
  );
};

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

export const filterMapActivities = (activities, searchText, sportType) => {
  const normalizedSearch = searchText.trim().toLowerCase();

  return activities.filter((activity) => {
    const matchesName =
      !normalizedSearch || activity.activityName.toLowerCase().includes(normalizedSearch);
    const matchesSport = !sportType || activity.activityType === sportType;

    return matchesName && matchesSport;
  });
};

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

export const getRouteCoordinates = (featureCollection) => {
  return featureCollection.features.flatMap((feature) => feature.geometry.coordinates);
};

export const getCameraFitKey = ({ filteredSportType, activityCount, isMobile }) => {
  return `${filteredSportType || 'all'}:${activityCount}:${isMobile ? 'mobile' : 'desktop'}`;
};

export const getMapViewCamera = (isThreeDimensional) => ({
  pitch: isThreeDimensional ? 55 : 0,
  bearing: isThreeDimensional ? -18 : 0,
});

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
