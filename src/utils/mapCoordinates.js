const MapCoordinates = (polylines_toGEOJSON) => {
  // convert the polyline coordinates to GEOJSON linestring
  const mapCoordinates = polylines_toGEOJSON?.coordinates.map((item) => {
    return item.map((coords) => {
      return coords;
    });
  });

  const data = {
    type: 'Feature',
    properties: { name: 'activity' },

    geometry: {
      type: 'LineString',
      coordinates: mapCoordinates,
    },
  };
  return data;
};

export default MapCoordinates;
