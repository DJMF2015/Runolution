const MapCoordinates = (activity_toGEOJSON) => {
  console.log({ activity_toGEOJSON });
  const mapCoordinates = activity_toGEOJSON?.coordinates.map((item) => {
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
