import { useMapEvent } from 'react-leaflet';
import L from 'leaflet';

const ControllingGroup = () => {
  const map = useMapEvent({
    layeradd() {
      let bounds = new L.LatLngBounds();
      map.eachLayer(function (layer) {
        if (layer instanceof L.FeatureGroup) {
          bounds.extend(layer.getBounds());
        }
      });
      if (bounds.isValid()) {
        map.flyToBounds([bounds]);
      }
    },
  });
};
export default ControllingGroup;
