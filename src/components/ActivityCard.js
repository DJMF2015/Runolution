import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import styled from 'styled-components';
import { getSufferScore, getMilesToKms, getMetresToFeet } from '../utils/conversion';
import ControllingGroup from './ControllingGroup';
import Map, { Source, Layer } from 'react-map-gl';
import polyline from '@mapbox/polyline';
import {
  MapContainer,
  TileLayer,
  FeatureGroup,
  LayersControl,
  Polyline,
} from 'react-leaflet';
import SkyLayer from 'react-map-gl';

const TOKEN =
  'pk.eyJ1IjoiZGptZjIwMTUiLCJhIjoiY2p1YjE2emV2MDgwazQ0cGlwZm91OXdmNSJ9.jTBvVcPyilJhSuAPsX_rmw'; // Set your mapbox token here

const skyLayer = {
  id: 'sky',
  type: 'sky',
  paint: {
    'sky-type': 'atmosphere',
    'sky-atmosphere-sun': [0.0, 0.0],
    'sky-atmosphere-sun-intensity': 15,
  },
};

export default function Activity() {
  const location = useLocation();
  const { from } = location.state;
  const coordinates = from?.map.summary_polyline;
  const activity_line = polyline.decode(coordinates);

  const layers = [
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

  return (
    <>
      <Wrapper>
        <article>
          <h3>{from.name}</h3>
          <Header>Suffer Score: </Header>
          <HeartBeat className="heart"></HeartBeat>

          <ActivityCard score={from.suffer_score}>
            {getSufferScore(from.suffer_score)}
          </ActivityCard>
          <h3>{`Average Heart Rate: ${from.average_heartrate}`}</h3>
          <h3>Kudos: {from.kudos_count} </h3>
          <h3>Distance: {getMilesToKms(from.distance)}</h3>
          <h3>Total Elevation: {getMetresToFeet(from.total_elevation_gain)}</h3>
        </article>
      </Wrapper>

      <Link style={{ textAlign: 'center', marginLeft: '49vw' }} to="/activities">
        Go Back
      </Link>
      <MapContainer
        style={{ height: '75vh', width: '75vw', margin: '0 auto', marginTop: '10vh' }}
        center={[55.89107433333993, -3.2169856689870358]}
        zoom={8}
        scrollWheelZoom={true}
      >
        <>
          <LayersControl position="topright" collapsed={false}>
            <LayersControl.Overlay name={from.name}>
              {layers.map((layer, index) => {
                return (
                  <LayersControl.BaseLayer
                    key={index}
                    checked={index === 0 ? true : false}
                    name={layer.name}
                  >
                    <TileLayer attribution={layer.attribution} url={layer.url} />
                  </LayersControl.BaseLayer>
                );
              })}
              <FeatureGroup>
                <Polyline
                  positions={activity_line}
                  pathOptions={{ color: 'red' }}
                  weight={3}
                  smoothFactor={0.7}
                  zoom={10}
                />
              </FeatureGroup>
            </LayersControl.Overlay>
          </LayersControl>
          <ControllingGroup />
        </>
      </MapContainer>
      <hr />
      {/* <Map
     
        polyline={activity_line}
        controller={true}
        style={{ height: '100vh', width: '100vw', margin: '0 auto' }}
        maxPitch={85}
        mapStyle="mapbox://styles/mapbox/satellite-v9"
        mapboxAccessToken={TOKEN}
        terrain={{ source: 'mapbox-dem', exaggeration: 1.5 }}
      >
        <Source
          id="mapbox-dem"
          type="geojson"
          url="mapbox://mapbox.mapbox-terrain-dem-v1"
          tileSize={512}
          maxzoom={14}
          distance={2}
          flyTo={true}
          center={[55.89107433333993, -3.2169856689870358]}
          data={activity_line}
          //
        />
        <Layer {...skyLayer} />
      </Map> */}
    </>
  );
}

const Header = styled.h3`
  text-align: center;
  font-family: Verdana, Geneva, Tahoma, sans-serif;
  color: black;
  text-shadow: 2em;
`;

const Wrapper = styled.div`
  border: ${(props) => props.theme.colour.black} 2px solid;
  max-width: 50%;
  text-align: center;
  margin: auto;
  margin-top: 2rem;
  margin-bottom: 2rem;
  border-radius: 10px;
`;

const HeartBeat = styled.div``;
const ActivityCard = styled.h3`
  position: relative;
  text-align: center;
  margin: 20px auto;
  background-color: ${(props) => props.theme.colour.ghostwhite};
  color: ${(props) =>
    props.score >= 150
      ? props.theme.colour.red
      : props.score > 50 && props.score < 150
      ? props.theme.colour.green
      : props.theme.colour.yellow};
`;
