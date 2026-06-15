import {
  ACTIVITIES_LINE_LAYER_ID,
  ACTIVITIES_SOURCE_ID,
  EMPTY_FEATURE_COLLECTION,
} from './activitiesMap';
import {
  ACTIVITY_ROUTE_LAYER_ID,
  ACTIVITY_ROUTE_SOURCE_ID,
  DEFAULT_FLYOVER_ROUTE_GRADIENT,
} from './flyover';

const getActivityColourExpression = [
  'match',
  ['get', 'activityType'],
  'Run',
  '#ef4444',
  'VirtualRun',
  '#ef4444',
  'TrailRun',
  '#ef4444',
  'Ride',
  '#3b82f6',
  'VirtualRide',
  '#3b82f6',
  'MountainBikeRide',
  '#3b82f6',
  'Swim',
  '#06b6d4',
  '#fc5200',
];

const TERRAIN_SOURCE_ID = 'mapbox-dem';
const ACTIVITY_MAP_FOG = {
  range: [0.1, 9],
  color: 'rgb(186, 210, 235)',
  'high-color': 'rgb(73, 152, 186)',
  'space-color': 'rgb(73, 152, 186)',
  'horizon-blend': 0.1,
  'star-intensity': 0,
};
const ACTIVITY_MAP_SKY_PAINT = {
  'sky-type': 'atmosphere',
  'sky-atmosphere-color': 'rgb(255, 255, 255)',
  'sky-atmosphere-halo-color': 'rgb(255, 255, 255)',
  'sky-atmosphere-sun': ['literal', [0.0, 0.0]],
  'sky-atmosphere-sun-intensity': 5,
};

const addTerrainSource = (map) => {
  if (!map.getSource(TERRAIN_SOURCE_ID)) {
    map.addSource(TERRAIN_SOURCE_ID, {
      type: 'raster-dem',
      url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
      tileSize: 512,
      maxzoom: 12,
    });
  }
};

const setMapTerrain = (map) => {
  addTerrainSource(map);
  map.setTerrain({
    source: TERRAIN_SOURCE_ID,
    exaggeration: 1.5,
  });
};

const setSkyPaintProperties = (map) => {
  Object.entries(ACTIVITY_MAP_SKY_PAINT).forEach(([property, value]) => {
    map.setPaintProperty('sky', property, value);
  });
};

const setMapAtmosphere = (map) => {
  map.setFog(ACTIVITY_MAP_FOG);

  if (!map.getLayer('sky')) {
    map.addLayer({
      id: 'sky',
      type: 'sky',
      paint: ACTIVITY_MAP_SKY_PAINT,
    });
    return;
  }

  setSkyPaintProperties(map);
};

const addActivitiesLayers = (map) => {
  setMapTerrain(map);
  setMapAtmosphere(map);

  if (!map.getSource(ACTIVITIES_SOURCE_ID)) {
    map.addSource(ACTIVITIES_SOURCE_ID, {
      type: 'geojson',
      data: EMPTY_FEATURE_COLLECTION,
    });
  }

  if (!map.getLayer('activities-casing')) {
    map.addLayer({
      id: 'activities-casing',
      type: 'line',
      source: ACTIVITIES_SOURCE_ID,
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: {
        'line-color': '#bec6ef',
        'line-width': 3,
        'line-opacity': 0.72,
      },
    });
  }

  if (!map.getLayer(ACTIVITIES_LINE_LAYER_ID)) {
    map.addLayer({
      id: ACTIVITIES_LINE_LAYER_ID,
      type: 'line',
      source: ACTIVITIES_SOURCE_ID,
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: {
        'line-color': getActivityColourExpression,
        'line-width': 2.5,
        'line-opacity': 0.92,
      },
    });
  }
};

export const addActivityMapLayers = (map, data) => {
  if (!map || !data) {
    return;
  }

  setMapAtmosphere(map);

  if (!map.getSource(ACTIVITY_ROUTE_SOURCE_ID)) {
    map.addSource(ACTIVITY_ROUTE_SOURCE_ID, {
      type: 'geojson',
      lineMetrics: true,
      data,
    });
  } else {
    map.getSource(ACTIVITY_ROUTE_SOURCE_ID).setData(data);
  }

  if (!map.getLayer(ACTIVITY_ROUTE_LAYER_ID)) {
    map.addLayer({
      type: 'line',
      source: ACTIVITY_ROUTE_SOURCE_ID,
      id: ACTIVITY_ROUTE_LAYER_ID,
      paint: {
        'line-width': 5,
        'line-color': DEFAULT_FLYOVER_ROUTE_GRADIENT,
      },
    });
  }
  setMapTerrain(map);
};

export default addActivitiesLayers;
