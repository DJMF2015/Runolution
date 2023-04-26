import { MapContainer, MapContainerProps } from 'react-leaflet';
import React from 'react';

export default function Map() {
  return (
    <MapContainer
      style={{ height: '75vh', width: '75vw', margin: '0 auto', marginTop: '10vh' }}
      center={[55.89107, -3.21698]}
      zoom={7}
      scrollWheelZoom={true}
    ></MapContainer>
  );
}
