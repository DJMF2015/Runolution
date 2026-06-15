import * as turf from '@turf/turf';
import { METRES_PER_KM } from './config';

const STREAM_KEYS = [
  'distance',
  'altitude',
  'time',
  'heartrate',
  'cadence',
  'watts',
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
 * arrays are preserved as route properties for camera and summary calculations.
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
