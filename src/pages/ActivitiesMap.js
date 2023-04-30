import React, { useState, useEffect } from 'react';
import polyline from '@mapbox/polyline';
import { getAthleteActivities, authenticateWithStrava } from '../utils/functions';
import { MapContainer, TileLayer, FeatureGroup, Polyline, Popup } from 'react-leaflet';

const ActivitiesMap = () => {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activityLoadingState, setActivityLoadingState] = useState(null);
  useEffect(() => {
    async function fetchData() {
      const stravaAuthResponse = await authenticateWithStrava();
      let polylines = [];
      let stravaActivityResponse;
      let looper_num = 1;
      // Looping until data is fetched from Strava API
      setLoading(true);
      while (looper_num || stravaActivityResponse.length !== 0) {
        let stravaActivityResponse_single = await getAthleteActivities(
          stravaAuthResponse[0].data?.access_token,
          200,
          looper_num
        );

        if (
          stravaActivityResponse_single.data.length === 0 ||
          stravaActivityResponse_single.data.errors
        ) {
          break;
        } else if (stravaActivityResponse) {
          setActivityLoadingState(stravaActivityResponse.length);
          stravaActivityResponse = stravaActivityResponse.concat(
            stravaActivityResponse_single.data
          );
        } else {
          stravaActivityResponse = stravaActivityResponse_single.data;
        }

        looper_num++;
      }

      for (let i = 0; i < stravaActivityResponse.length; i += 1) {
        const activity_polyline = stravaActivityResponse[i].map.summary_polyline;
        const activityName = stravaActivityResponse[i].name;

        polylines.push({
          activityPositions: polyline.decode(activity_polyline),
          activityName: activityName,
        });
      }
      setLoading(false);
      setNodes(polylines);
    }

    fetchData();
    // eslint-disable-next-line
  }, []);

  if (loading)
    return (
      <div style={{ body: 'black' }}>
        <h1 style={{ color: 'red', textAlign: 'center' }}>
          Wait - Plotting {activityLoadingState} activities...
        </h1>
      </div>
    );
  console.log(nodes);
  return (
    <>
      <MapContainer
        style={{ height: '100vh', width: '100vw', margin: '0 auto', marginTop: '2vh' }}
        center={[55.89107, -3.21698]}
        zoom={7}
        bounds={nodes.map((node) => node.activityPositions)} //
        boundsOptions={{ padding: [50, 50] }}
        maxBoundsViscosity={1.0}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='Powered by <a href="https://www.geoapify.com/" target="_blank">Geoapify</a> | <a href="https://openmaptiles.org/" target="_blank">© OpenMapTiles</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">© OpenStreetMap</a> contributors'
          maxZoom={20}
          id="osm-bright"
          url="https://maps.geoapify.com/v1/tile/dark-matter-brown/{z}/{x}/{y}.png?apiKey=d94e4561c3c649a9bbf06a2ef3f445fb"
        />

        {nodes &&
          nodes.map((activity, i) => (
            <>
              <>
                <FeatureGroup>
                  <Polyline
                    positions={activity.activityPositions}
                    key={i}
                    weight={3}
                    color="red"
                    smoothFactor={0.7}
                    vectorEffect="non-scaling-stroke"
                    opacity={0.5}
                    zoom={12}
                  />
                  <Popup>{activity.activityName}</Popup>
                </FeatureGroup>
              </>
            </>
          ))}
      </MapContainer>
    </>
  );
};
export default ActivitiesMap;
