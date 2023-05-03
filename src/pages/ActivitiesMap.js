import React, { useState, useEffect } from 'react';
import polyline from '@mapbox/polyline';
import { getAthleteActivities } from '../utils/functions';
import { authenticateWithStrava, catchErrors } from '../utils/helpers';
import { formattedDate } from '../utils/conversion';
import Login from './Login';
import SearchBar from '../utils/search';
import styled from 'styled-components';
import { MapContainer, TileLayer, FeatureGroup, Polyline, Popup } from 'react-leaflet';

const ActivitiesMap = () => {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTxt, setSearchTxt] = useState('');
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
        const activityDate = formattedDate(stravaActivityResponse[i].start_date_local);
        const activityName = stravaActivityResponse[i].name;
        const activityType = stravaActivityResponse[i].type;
        const activityId = stravaActivityResponse[i].id;
        polylines.push({
          activityPositions: polyline.decode(activity_polyline),
          activityName: activityName,
          activityDate: activityDate,
          activityType: activityType,
          activityId: activityId,
        });
      }
      setLoading(false);
      setNodes(polylines);
    }

    fetchData();
    // eslint-disable-next-line
  }, []);

  const filteredName = nodes.filter((activity) => {
    return activity.activityName.toLowerCase().includes(searchTxt.toLowerCase());
  });

  if (!nodes.length === 0 && loading)
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
      <SearchBar searchTxt={searchTxt} updateSearchTxt={setSearchTxt} />
      {!nodes && nodes.length === 0 ? (
        <Login />
      ) : (
        <>
          <SideNavigation>
            {filteredName &&
              filteredName.map((activity, i) => (
                <a
                  href={`https://www.strava.com/activities/${activity.activityId}`}
                  target="_blank"
                  rel="noreferrer"
                  key={i}
                >
                  {activity.activityDate + ' '}
                  {activity.activityName + ' '}
                  {activity.activityType + ' '}
                </a>
              ))}
          </SideNavigation>
          <div>
            <MapContainer
              style={{ height: '100vh', width: '100vw', zIndex: 0 }}
              center={[55.89107, -3.21698]}
              zoom={7}
              zoomControl={false}
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

              {filteredName &&
                filteredName.map((activity, i) => (
                  <div>
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
                      <Popup>
                        {activity.activityName + ' ' + activity.activityDate}{' '}
                        <a
                          href={`https://www.strava.com/activities/${activity.activityId}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View on Strava
                        </a>
                      </Popup>
                    </FeatureGroup>
                  </div>
                ))}
            </MapContainer>
          </div>
        </>
      )}
    </>
  );
};
export default ActivitiesMap;

const SideNavigation = styled.div`
  height: 100%;
  margin-top: 100px;
  width: 200px;
  display: block;
  position: fixed;
  z-index: 1;
  top: 0;
  left: 0;
  scroll-behavior: smooth;
  overflow-y: scroll;
  padding-top: 20px;
  background-color: #111;
  opacity: 0.5;
  color: #f1f1f1;

  /* customise scrollbar for modern browser except firefox*/
  ::-webkit-scrollbar {
    width: 10px;
  }
  ::-webkit-scrollbar-track {
    box-shadow: inset 0 0 5px grey;
    border-radius: 10px;
  }
  ::-webkit-scollbar-thumb {
    background: #888;
    border-radius: 10px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: #555;
  }

  ::-webkit-scrollbar-thumb:active {
    background-color: #555;
  }
  ::-webkit-scrollbar-thumb:window-inactive {
    background-color: #555;
  }
  ::-webkit-scrollbar-thumb:horizontal {
    background-color: #555;
  }
  ::-webkit-scrollbar-thumb:vertical {
    background-color: #555;
  }

  a {
    padding: 4px 3px 4px 20px;
    line-break: 2px;
    text-decoration: none;
    font-size: 12px;
    color: #f1f1f1;
    display: block;
  }

  a:hover {
    color: #f1f1f1;
    text-decoration: underline;
  }

  @media screen and (max-width: 750px) {
    width: 125px;
    font-size: 10px;
    a {
      font-size: 10px;
      color: #f1f1f1;
    }
  }
`;
