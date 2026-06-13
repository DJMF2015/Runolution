/**
 * Creates the DOM element used by the Mapbox marker during route flyover.
 */
export const createFlyoverMarkerElement = () => {
  const markerElement = document.createElement('div');
  markerElement.className = 'flyover-marker';
  markerElement.src = '/assets/profileMarker.jpg';
  markerElement.style.backgroundImage = 'url(/src/assets/profileMarker.jpg)';
  markerElement.style.backgroundSize = 'contain';
  markerElement.style.backgroundRepeat = 'no-repeat';
  markerElement.style.width = '40px';
  markerElement.style.height = '40px';
  markerElement.style.borderRadius = '50%';
  markerElement.style.border = '1px solid white';
  markerElement.style.boxShadow = '0 0 5px rgba(0,0,0,0.5)';
  return markerElement;
};
