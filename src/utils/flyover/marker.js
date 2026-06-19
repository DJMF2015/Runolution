/**
 * Creates the DOM element used by the Mapbox marker during route flyover.
 */
import { FLYOVER_MARKER_SIZE_PX } from './config';

const getFlyoverMarkerColor = (mapStyle) => {
  return mapStyle === 'satellite' ? '#ef1d1d' : '#facc15';
};

export const createFlyoverMarkerElement = (mapStyle) => {
  const markerElement = document.createElement('div');
  markerElement.style.width = `${FLYOVER_MARKER_SIZE_PX}px`;
  markerElement.style.height = `${FLYOVER_MARKER_SIZE_PX}px`;
  markerElement.style.border = '2px solid #050505';
  markerElement.style.borderRadius = '50%';
  markerElement.style.background = getFlyoverMarkerColor(mapStyle);
  markerElement.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.38)';
  markerElement.style.boxSizing = 'border-box';
  markerElement.style.pointerEvents = 'none';
  return markerElement;
};
