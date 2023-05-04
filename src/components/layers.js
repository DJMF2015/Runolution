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
    name: 'Thunderforest',
    attribution:
      '&copy; <a href="http://www.thunderforest.com/">Thunderforest</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    url: `https://tile.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey=d28e4b3c141d47fe9d0b7ebccfebf144`,
  },
  {
    name: 'Light Grey',
    attribution:
      '&copy; <a href="http://www.thunderforest.com/">Light Grey</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    url: `http://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}`,
  },
  {
    name: 'Satellite',
    attribution:
      '&copy; <a href="http://www.thunderforest.com/">Thunderforest</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    url: `http://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`,
  },
];
export default Layers;
