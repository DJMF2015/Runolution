import React, { useState, useEffect } from 'react';
import polyline from '@mapbox/polyline';
import axios from 'axios';
import {
  MapContainer,
  useMapEvent,
  TileLayer,
  FeatureGroup,
  Polyline,
  Popup,
} from 'react-leaflet';
// import ControllingGroup from '../components/ControllingGroup';

const ActivitiesMap = () => {
  const auth_link = 'https://www.strava.com/oauth/token';
  const activities_link = `https://www.strava.com/api/v3/athlete/activities?include_all_efforts=true`;
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [activityLoadingState, setActivityLoadingState] = useState(null);
  useEffect(() => {
    async function fetchData() {
      const stravaAuthResponse = await Promise.all([
        axios.post(
          `${auth_link}?client_id=${process.env.REACT_APP_CLIENT_ID}&client_secret=${process.env.REACT_APP_CLIENT_SECRET}&refresh_token=${process.env.REACT_APP_REFRESH_SECRET}&grant_type=refresh_token`
        ),
      ]);

      let polylines = [];
      let stravaActivityResponse;
      let looper_num = 1;
      // Looping until data is fetched from Strava API
      while (looper_num || stravaActivityResponse.length !== 0) {
        let stravaActivityResponse_single = await axios.get(
          `${activities_link}?per_page=200&page=${looper_num}&access_token=${stravaAuthResponse[0].data.access_token}`
        );
        setLoading(true);
        if (
          stravaActivityResponse_single.data.length === 0 ||
          stravaActivityResponse_single.data.errors
        ) {
          setLoading(false);
          break;
        } else if (stravaActivityResponse) {
          console.log(stravaActivityResponse.length);
          const percentTotal = (stravaActivityResponse.length / 1470) * 100;
          const data = percentTotal.toFixed(2);
          setActivityLoadingState(data.concat('%'));
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
        const activity_distance = stravaActivityResponse[i].distance;
        const elevation = stravaActivityResponse[i].total_elevation_gain;
        const activityName = stravaActivityResponse[i].name;
        const activity_heart_rate =
          stravaActivityResponse[i].has_heartrate === true
            ? stravaActivityResponse[i].average_heartrate
            : 'No Heart Rate Data';

        let activityColorElevation = '';
        let activityColorDistance = '';
        let activityColorHeartRate = '';
        if (activity_distance > 0 && activity_distance < 10000.0) {
          activityColorDistance = 'yellow';
        } else if (activity_distance > 10000.0 && activity_distance < 10500.0) {
          activityColorDistance = 'lightblue';
        } else if (activity_distance > 15000.0 && activity_distance < 20000.0) {
          activityColorDistance = 'white';
        } else if (activity_distance > 20000.0) {
          activityColorDistance = 'red';
        } else {
          activityColorDistance = 'lightgreen';
        }

        if (elevation > 0 && elevation < 100.1) {
          activityColorElevation = 'yellow';
        } else if (elevation > 100.1 && elevation < 250.1) {
          activityColorElevation = 'lightblue';
        } else if (elevation > 250.1 && elevation < 500.1) {
          activityColorElevation = 'white';
        } else if (elevation > 500.1) {
          activityColorElevation = 'red';
        } else {
          activityColorElevation = 'lightgreen';
        }
        if (activity_heart_rate > 0 && activity_heart_rate < 100.1) {
          activityColorHeartRate = 'yellow';
        } else if (activity_heart_rate > 100.1 && activity_heart_rate < 150) {
          activityColorHeartRate = 'lightblue';
        } else if (activity_heart_rate > 150) {
          activityColorHeartRate = 'white';
        } else if (activity_heart_rate > 200) {
          activityColorHeartRate = 'red';
        } else {
          activityColorHeartRate = 'lightgreen';
        }

        polylines.push({
          activityPositions: polyline.decode(activity_polyline),
          activityColorHeartRate: activityColorHeartRate,
          activityElevation: elevation,
          activity_distance: activity_distance,
          activityName: activityName,
          activityColorElevation: activityColorElevation,
          activityColorDistance: activityColorDistance,
        });
      }

      setNodes(polylines);
      console.log({ polylines });
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
      <button onClick={() => setIsActive(!isActive)}>Toggle Colour</button>

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
                    pathOptions={
                      isActive
                        ? { color: activity.activityColorDistance }
                        : { color: activity.activityColorHeartRate }
                    }
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
