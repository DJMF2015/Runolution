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

const EMPTY_FEATURE_COLLECTION = {
  type: 'FeatureCollection',
  features: [],
};

const addTerrainSource = (map) => {
  if (!map.getSource('mapbox-dem')) {
    map.addSource('mapbox-dem', {
      type: 'raster-dem',
      url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
      tileSize: 512,
      maxzoom: 14,
    });
  }
};

const addActivitiesLayers = (map) => {
  addTerrainSource(map);

  map.setTerrain({
    source: 'mapbox-dem',
    exaggeration: 1.5,
  });
  map.setFog({
    range: [5, 10],
    color: 'transparent',
    'horizon-blend': 0.1,
    'high-color': '#73ccf2',
    'space-color': '#4f9cf5',
    'star-intensity': 0.15,
  });

  if (!map.getSource('activities')) {
    map.addSource('activities', {
      type: 'geojson',
      data: EMPTY_FEATURE_COLLECTION,
    });
  }

  if (!map.getLayer('activities-casing')) {
    map.addLayer({
      id: 'activities-casing',
      type: 'line',
      source: 'activities',
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: {
        'line-color': '#020617',
        'line-width': 3,
        'line-opacity': 0.72,
      },
    });
  }

  if (!map.getLayer('activities-lines')) {
    map.addLayer({
      id: 'activities-lines',
      type: 'line',
      source: 'activities',
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

  map.setFog({
    'horizon-blend': 0.2,
    'space-color': 'rgb(10, 10, 10)',
    'star-intensity': 1,
  });

  addTerrainSource(map);

  if (!map.getLayer('terrain-data')) {
    map.addLayer({
      id: 'terrain-data',
      type: 'line',
      source: {
        type: 'vector',
        url: 'mapbox://mapbox.mapbox-terrain-v2',
      },
      'source-layer': 'contour',
    });
  }

  map.setTerrain({
    source: 'mapbox-dem',
    exaggeration: 1.5,
  });

  if (!map.getLayer('sky')) {
    map.addLayer({
      id: 'sky',
      type: 'sky',
      paint: {
        'sky-type': 'atmosphere',
        'sky-atmosphere-sun': [0, 1.0],
        'sky-atmosphere-sun-intensity': 5,
      },
    });
  }

  if (!map.getSource('linepath')) {
    map.addSource('linepath', {
      type: 'geojson',
      lineMetrics: true,
      data,
    });
  } else {
    map.getSource('linepath').setData(data);
  }

  if (!map.getLayer('line-dashed')) {
    map.addLayer({
      type: 'line',
      source: 'linepath',
      id: 'line-dashed',
      paint: {
        'line-width': 5,
        'line-gradient': ['interpolate', ['linear'], ['line-progress'], 1, 'red'],
      },
    });
  }
};

export default addActivitiesLayers;
