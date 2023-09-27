const Layers = [
  {
    name: 'Osm Mapnik',
    attribution:
      '&copy; <a href="http://openstreetmap.org">OpenStreetMap</a>OpenStreetMap</a> contributors',
    url: 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  },
  {
    name: 'ArcGIS-Dark',
    attribution: 'ARCGIS, OS & GIS Community"',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
  },
  {
    name: 'UK Open ZoomStack Day',
    attribution: 'OS & GIS Community',
    url: 'https://api.maptiler.com/maps/dataviz/{z}/{x}/{y}.png?key=P4mXjfln7pyu2rZS6XhZ',
  },
  {
    name: 'Open ZoomStack Night',
    attribution: 'OS & GIS Community',
    url: 'https://api.maptiler.com/maps/uk-openzoomstack-night/{z}/{x}/{y}.png?key=P4mXjfln7pyu2rZS6XhZ',
  },
  {
    name: 'Satellite',
    attribution:
      '&copy; <a href="http://www.thunderforest.com/">Thunderforest</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    url: `http://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`,
  },
];
export default Layers;
