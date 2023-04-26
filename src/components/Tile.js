import L from 'leaflet';
import { TileLayer } from 'react-leaflet';
import React from 'react';

export default function Tile() {
  return (
    <TileLayer
      attribution="&copy; Esri &mdash; Esri, DeLorme & Ordnance Survey"
      url="https://tile.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey=d28e4b3c141d47fe9d0b7ebccfebf144"
    />
  );
}
